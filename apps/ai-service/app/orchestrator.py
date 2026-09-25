"""The agentic pipeline: Intake -> Safety pre-check -> Knowledge Retrieval ->
[Symptom + Women's Health in parallel] -> Risk -> Safety (gate) -> Care
Planner -> final response.

The Safety/Triage Agent actually runs twice: once immediately after Intake
(before Knowledge Retrieval or Symptom/Women's Health even start, so a clear
emergency short-circuits the whole pipeline instantly, without spending time
on retrieval) and once again after Risk Assessment as a final gate before the
Care Planner runs. Either trip stops the pipeline.

Knowledge Retrieval (Phase 5, RAG) runs once per query/report and hands its
retrieved chunks to the reasoning agents as grounding context; the final
response's `sources[]` is built only from what was actually retrieved —
empty when nothing cleared the similarity threshold, never fabricated.

This module is UI-agnostic: `run_pipeline` is an async generator of plain
dict events. app/routes/chat.py wraps it as Server-Sent Events; nothing here
knows about HTTP.
"""

from __future__ import annotations

import asyncio
import re
import logging
import time
import uuid
from typing import Any, AsyncIterator

from app.agents import (
    CarePlannerAgent,
    ChatReplyAgent,
    DocumentIntelligenceAgent,
    IntakeAgent,
    KnowledgeRetrievalAgent,
    RiskAssessmentAgent,
    SafetyTriageAgent,
    SymptomAnalysisAgent,
    WomensHealthAgent,
)
from app.llm import get_llm_provider
from app.utils import lab_values as lv
from app.utils.ocr import extract_text

logger = logging.getLogger("herai.orchestrator")

DISCLAIMER = (
    "HERAI provides health information and risk-awareness support. It does not diagnose "
    "conditions and is not a substitute for professional medical care. If you're worried, "
    "please consult a licensed clinician."
)

_RISK_RANK = {"low": 0, "moderate": 1, "high": 2, "urgent": 3}


def _step_event(agent: str, label: str, status: str, data: Any = None, duration_ms: float | None = None) -> dict:
    event: dict[str, Any] = {"type": "agent_step", "agent": agent, "label": label, "status": status}
    if data is not None:
        event["data"] = data
    if duration_ms is not None:
        event["duration_ms"] = duration_ms
    return event


async def _timed(coro) -> tuple[Any, float]:
    t0 = time.perf_counter()
    result = await coro
    return result, round((time.perf_counter() - t0) * 1000, 1)


async def _run_stage(request_id: str, stage: str, coro) -> tuple[Any, float]:
    """Every await on an agent goes through here so a hang or a crash is
    always visible in the log at the exact stage it happened, not just as a
    generic "the request never came back."

    Concretely: if a request hangs, you will see `status=start` logged for
    the stuck stage but never its matching `status=complete` — that's the
    one to look at. If a stage raises, `status=error` logs the full
    traceback here, before the exception re-raises and app/routes/chat.py's
    except-block turns it into an SSE `error` event for the client.
    """
    logger.info("[%s] stage=%s status=start", request_id, stage)
    t0 = time.perf_counter()
    try:
        result = await coro
    except Exception:
        dt = round((time.perf_counter() - t0) * 1000, 1)
        logger.exception("[%s] stage=%s status=error duration_ms=%s", request_id, stage, dt)
        raise
    dt = round((time.perf_counter() - t0) * 1000, 1)
    logger.info("[%s] stage=%s status=complete duration_ms=%s", request_id, stage, dt)
    return result, dt


def _compute_confidence(ctx: dict) -> tuple[float, list[str]]:
    reasons: list[str] = []
    confidence = float(ctx["intake"].get("confidence", 0.6))

    missing = ctx["intake"].get("missing_info") or []
    if missing:
        confidence -= 0.05 * len(missing)
        reasons.append(f"Missing details: {', '.join(missing)}")

    risk_level = (ctx.get("risk_assessment") or {}).get("risk_level")
    if risk_level in ("high", "urgent"):
        confidence -= 0.1
        reasons.append("Elevated risk level increases the importance of clinical confirmation")

    if not ctx.get("health_profile"):
        confidence -= 0.1
        reasons.append("No health profile on file to personalize this further")

    confidence = max(0.3, min(0.95, round(confidence, 2)))
    reasons.append("HERAI never provides a confirmed diagnosis — treat this as a starting point for a clinician conversation")
    return confidence, reasons


def _collect_follow_ups(ctx: dict) -> list[str]:
    seen: list[str] = []
    for key in ("symptom_analysis", "womens_health"):
        for question in (ctx.get(key) or {}).get("follow_up_questions", []) or []:
            if question not in seen:
                seen.append(question)
    return seen[:5]


def _collect_sources(ctx: dict) -> list[dict]:
    """Built ONLY from what KnowledgeRetrievalAgent actually retrieved —
    empty whenever retrieval found nothing above the similarity threshold,
    never a fabricated citation.
    """
    chunks = (ctx.get("knowledge_retrieval") or {}).get("chunks", [])
    seen_titles: set[str] = set()
    sources: list[dict] = []
    for chunk in chunks:
        if chunk["title"] in seen_titles:
            continue
        seen_titles.add(chunk["title"])
        sources.append(
            {"title": chunk["title"], "source": chunk["source"], "url": chunk.get("url"), "topic": chunk["topic"]}
        )
    return sources


def _build_emergency_response(ctx: dict, safety: dict, trace: list[dict]) -> dict:
    return {
        "emergency": True,
        "message": safety["message"],
        "recommended_action": safety["recommended_action"],
        "matched_signals": safety["matched_signals"],
        "intake": ctx.get("intake"),
        "confidence": 0.95,
        "confidence_reasons": ["Emergency indicators were detected directly in your message."],
        "follow_up_questions": [],
        "disclaimer": DISCLAIMER,
        "agent_trace": trace,
    }


OFF_TOPIC_REPLY = (
    "I'm built to help with women's health, your cycle, symptoms, lab reports and wellbeing, so I can't help "
    "with that one. Is there anything about your health I can help with?"
)
OFF_TOPIC_SUGGESTIONS = [
    "Why is my period late?",
    "What can help with cramps?",
    "Explain my lab report",
]
# Intake classifications that should get a normal conversational answer
# rather than the full symptom -> risk -> care-plan pipeline.
CONVERSATIONAL = {"greeting", "informational", "general_question", "off_topic"}

# Small talk is never "off topic". The model occasionally mislabels a bare
# "hey", so greetings and thanks are decided here, not left to the classifier.
_SMALL_TALK = re.compile(
    r"^\s*(h+i+|he+y+|hello+|hola|namaste|yo|sup|good\s+(morning|afternoon|evening|night)|thanks?( you)?|thank u|ok(ay)?|cool|great|bye|goodbye|how are you)[\s!.?,]*$",
    re.IGNORECASE,
)


def _build_reply_response(
    ctx: dict, reply: str, follow_ups: list[str], trace: list[dict], suggest_help: bool = False
) -> dict:
    return {
        "kind": "reply",
        "emergency": False,
        "reply": reply,
        "intake": ctx.get("intake"),
        "follow_up_questions": follow_ups[:3],
        "sources": _collect_sources(ctx),
        "suggest_help": suggest_help,
        "confidence": None,
        "disclaimer": DISCLAIMER,
        "agent_trace": trace,
    }


def _build_final_response(ctx: dict, care_plan: dict, trace: list[dict]) -> dict:
    confidence, reasons = _compute_confidence(ctx)
    return {
        "kind": "assessment",
        "emergency": False,
        "reply": (ctx.get("symptom_analysis") or {}).get("summary"),
        "intake": ctx.get("intake"),
        "symptom_analysis": ctx.get("symptom_analysis"),
        "womens_health": ctx.get("womens_health"),
        "risk_assessment": ctx.get("risk_assessment"),
        "care_plan": care_plan,
        "confidence": confidence,
        "confidence_reasons": reasons,
        "follow_up_questions": _collect_follow_ups(ctx),
        "sources": _collect_sources(ctx),
        "disclaimer": DISCLAIMER,
        "agent_trace": trace,
    }


_DOC_CONFIDENCE_BASE = {"high": 0.85, "medium": 0.65, "low": 0.4}


def _compute_document_confidence(ctx: dict) -> tuple[float, list[str]]:
    reasons: list[str] = []
    doc = ctx.get("document_intelligence") or {}
    confidence = _DOC_CONFIDENCE_BASE.get(doc.get("confidence", "medium"), 0.6)

    values = ctx.get("extracted_values") or []
    unparseable = [v for v in values if v.get("status") == "unparseable"]
    if unparseable:
        confidence -= 0.05 * len(unparseable)
        reasons.append(f"{len(unparseable)} value(s) on the report could not be parsed cleanly")

    if not values:
        confidence -= 0.15
        reasons.append("No values could be confidently extracted from this document")

    if not ctx.get("health_profile"):
        confidence -= 0.05
        reasons.append("No health profile on file to personalize this further")

    confidence = max(0.2, min(0.95, round(confidence, 2)))
    reasons.append("HERAI never provides a confirmed diagnosis — treat this as a starting point for a clinician conversation")
    return confidence, reasons


def _build_document_emergency_response(ctx: dict, safety: dict, trace: list[dict]) -> dict:
    # Unlike the chat pipeline's emergency response, a document run keeps the
    # extracted table/explanation alongside the banner — for a lab report,
    # seeing WHICH value triggered the alert is the point.
    return {
        "emergency": True,
        "message": safety["message"],
        "recommended_action": safety["recommended_action"],
        "matched_signals": safety["matched_signals"],
        "ocr": ctx.get("ocr"),
        "extracted_values": ctx.get("extracted_values"),
        "document_intelligence": ctx.get("document_intelligence"),
        "womens_health": ctx.get("womens_health"),
        "risk_assessment": ctx.get("risk_assessment"),
        "care_plan": None,
        "confidence": 0.95,
        "confidence_reasons": ["Emergency indicators were detected directly in this report's values."],
        "questions_to_ask": [],
        "sources": _collect_sources(ctx),
        "disclaimer": DISCLAIMER,
        "agent_trace": trace,
    }


def _build_document_final_response(ctx: dict, care_plan: dict, trace: list[dict]) -> dict:
    confidence, reasons = _compute_document_confidence(ctx)
    return {
        "emergency": False,
        "ocr": ctx.get("ocr"),
        "extracted_values": ctx.get("extracted_values"),
        "document_intelligence": ctx.get("document_intelligence"),
        "womens_health": ctx.get("womens_health"),
        "risk_assessment": ctx.get("risk_assessment"),
        "care_plan": care_plan,
        "confidence": confidence,
        "confidence_reasons": reasons,
        "questions_to_ask": care_plan.get("discuss_with_clinician", []),
        "sources": _collect_sources(ctx),
        "disclaimer": DISCLAIMER,
        "agent_trace": trace,
    }


async def run_document_pipeline(
    file_bytes: bytes,
    mime_type: str,
    filename: str,
    health_profile: dict | None,
) -> AsyncIterator[dict]:
    """A document upload enters the SAME orchestrator, just at the Document
    Intelligence Agent instead of the Intake Agent: OCR -> value extraction ->
    validation -> Document Intelligence -> [Women's Health if relevant] ->
    Risk Assessment -> Safety gate -> Care Planner. Reuses the exact same
    Agent classes (and the same Safety/Triage hard gate) as the chat pipeline.
    """
    request_id = uuid.uuid4().hex[:8]
    llm = get_llm_provider()
    trace: list[dict] = []
    ctx: dict[str, Any] = {
        "message": f"Lab report uploaded: {filename}",
        "health_profile": health_profile or {},
        "history": [],
    }

    logger.info(
        "[%s] pipeline=document status=start filename=%r mime_type=%s bytes=%d has_health_profile=%s",
        request_id, filename, mime_type, len(file_bytes), bool(health_profile),
    )
    t_pipeline_start = time.perf_counter()
    yield {"type": "pipeline_start"}

    try:
        # 1. OCR / text extraction
        yield _step_event("ocr", "Reading document", "start")
        ocr_result, dt = await _run_stage(request_id, "ocr", asyncio.to_thread(extract_text, file_bytes, mime_type))
        ctx["ocr"] = {
            "method": ocr_result.method,
            "confidence": ocr_result.confidence,
            "char_count": len(ocr_result.text),
            "warnings": ocr_result.warnings,
        }
        trace.append({"agent": "ocr", "duration_ms": dt})
        yield _step_event("ocr", "Reading document", "complete", ctx["ocr"], dt)

        # 2. Structured value extraction
        yield _step_event("value_extraction", "Extracting values", "start")
        raw_values, dt = await _run_stage(request_id, "value_extraction", asyncio.to_thread(lv.extract_values, ocr_result.text))
        trace.append({"agent": "value_extraction", "duration_ms": dt})
        yield _step_event("value_extraction", "Extracting values", "complete", {"found": len(raw_values)}, dt)

        # 3. Validation
        yield _step_event("validation", "Checking reference ranges", "start")
        validated, dt = await _run_stage(request_id, "validation", asyncio.to_thread(lv.validate_values, raw_values))
        ctx["extracted_values"] = validated
        trace.append({"agent": "validation", "duration_ms": dt})
        yield _step_event("validation", "Checking reference ranges", "complete", {"values": validated}, dt)

        # 4. Knowledge Retrieval — grounds Document Intelligence in the curated
        # knowledge base, searching on the abnormal parameter names found above.
        knowledge_agent = KnowledgeRetrievalAgent(llm)
        yield _step_event(knowledge_agent.name, knowledge_agent.label, "start")
        knowledge_out, dt = await _run_stage(request_id, knowledge_agent.name, knowledge_agent.run(ctx))
        ctx["knowledge_retrieval"] = knowledge_out
        trace.append({"agent": knowledge_agent.name, "duration_ms": dt})
        yield _step_event(knowledge_agent.name, knowledge_agent.label, "complete", knowledge_out, dt)

        # 5. Document Intelligence Agent
        doc_agent = DocumentIntelligenceAgent(llm)
        yield _step_event(doc_agent.name, doc_agent.label, "start")
        doc_out, dt = await _run_stage(request_id, doc_agent.name, doc_agent.run(ctx))
        ctx["document_intelligence"] = doc_out
        trace.append({"agent": doc_agent.name, "duration_ms": dt})
        yield _step_event(doc_agent.name, doc_agent.label, "complete", doc_out, dt)

        # 6. Women's Health Intelligence, if any extracted parameter is relevant.
        if any(v["parameter"] in lv.WOMENS_HEALTH_PARAMETERS for v in validated):
            wh_agent = WomensHealthAgent(llm)
            yield _step_event(wh_agent.name, wh_agent.label, "start")
            wh_out, dt = await _run_stage(request_id, wh_agent.name, wh_agent.run(ctx))
            ctx["womens_health"] = wh_out
            trace.append({"agent": wh_agent.name, "duration_ms": dt})
            yield _step_event(wh_agent.name, wh_agent.label, "complete", wh_out, dt)

        # 7. Risk Assessment — same agent the chat pipeline uses.
        risk_agent = RiskAssessmentAgent(llm)
        yield _step_event(risk_agent.name, risk_agent.label, "start")
        risk_out, dt = await _run_stage(request_id, risk_agent.name, risk_agent.run(ctx))
        ctx["risk_assessment"] = risk_out
        trace.append({"agent": risk_agent.name, "duration_ms": dt})
        yield _step_event(risk_agent.name, risk_agent.label, "complete", risk_out, dt)

        # 8. Safety gate — same hard gate the chat pipeline uses, now also
        # checking extracted_values directly for a critical result.
        safety_agent = SafetyTriageAgent(llm)
        yield _step_event(safety_agent.name, safety_agent.label, "start")
        safety_out, dt = await _run_stage(request_id, "safety_gate", safety_agent.run(ctx))
        trace.append({"agent": "safety_gate", "duration_ms": dt})
        yield _step_event(safety_agent.name, safety_agent.label, "complete", safety_out, dt)

        if safety_out["emergency"]:
            result = _build_document_emergency_response(ctx, safety_out, trace)
            yield {"type": "emergency", "data": safety_out}
            yield {"type": "final", "data": result}
            logger.info("[%s] pipeline=document status=complete outcome=emergency", request_id)
            return

        # 9. Care Planner — same agent; an abnormal report now adds items to the
        # user's care plan alongside anything from chat-driven runs.
        care_agent = CarePlannerAgent(llm)
        yield _step_event(care_agent.name, care_agent.label, "start")
        care_out, dt = await _run_stage(request_id, care_agent.name, care_agent.run(ctx))
        trace.append({"agent": care_agent.name, "duration_ms": dt})
        yield _step_event(care_agent.name, care_agent.label, "complete", care_out, dt)

        yield {"type": "final", "data": _build_document_final_response(ctx, care_out, trace)}
        total_ms = round((time.perf_counter() - t_pipeline_start) * 1000, 1)
        logger.info("[%s] pipeline=document status=complete outcome=ok total_ms=%s", request_id, total_ms)
    except Exception:
        total_ms = round((time.perf_counter() - t_pipeline_start) * 1000, 1)
        logger.exception("[%s] pipeline=document status=failed total_ms=%s", request_id, total_ms)
        raise


async def run_pipeline(
    message: str,
    health_profile: dict | None,
    history: list[dict] | None = None,
) -> AsyncIterator[dict]:
    request_id = uuid.uuid4().hex[:8]
    llm = get_llm_provider()
    trace: list[dict] = []
    ctx: dict[str, Any] = {"message": message, "health_profile": health_profile or {}, "history": history or []}

    logger.info(
        "[%s] pipeline=chat status=start message_len=%d has_health_profile=%s",
        request_id, len(message), bool(health_profile),
    )
    t_pipeline_start = time.perf_counter()
    yield {"type": "pipeline_start"}

    try:
        # 1. Intake
        intake_agent = IntakeAgent(llm)
        yield _step_event(intake_agent.name, intake_agent.label, "start")
        intake_out, dt = await _run_stage(request_id, intake_agent.name, intake_agent.run(ctx))
        ctx["intake"] = intake_out
        trace.append({"agent": intake_agent.name, "duration_ms": dt})
        yield _step_event(intake_agent.name, intake_agent.label, "complete", intake_out, dt)

        # 2. Safety pre-check — hard gate, runs before anything else finishes.
        safety_agent = SafetyTriageAgent(llm)
        yield _step_event(safety_agent.name, safety_agent.label, "start")
        safety_pre, dt = await _run_stage(request_id, "safety_precheck", safety_agent.run(ctx))
        trace.append({"agent": "safety_precheck", "duration_ms": dt})
        yield _step_event(safety_agent.name, safety_agent.label, "complete", safety_pre, dt)

        if safety_pre["emergency"]:
            result = _build_emergency_response(ctx, safety_pre, trace)
            yield {"type": "emergency", "data": safety_pre}
            yield {"type": "final", "data": result}
            logger.info("[%s] pipeline=chat status=complete outcome=emergency_precheck", request_id)
            return

        # 3a. Conversational branch. Greetings, plain health questions and
        # off-topic messages get a natural reply instead of the assessment
        # pipeline. The safety pre-check above has already run for all of them.
        classification = (intake_out.get("request_classification") or "").lower()
        if _SMALL_TALK.match(message):
            classification = "greeting"
        if classification in CONVERSATIONAL:
            if classification == "off_topic":
                yield {"type": "final", "data": _build_reply_response(ctx, OFF_TOPIC_REPLY, OFF_TOPIC_SUGGESTIONS, trace)}
                logger.info("[%s] pipeline=chat status=complete outcome=off_topic", request_id)
                return

            if classification in ("informational", "general_question"):
                knowledge_agent = KnowledgeRetrievalAgent(llm)
                yield _step_event(knowledge_agent.name, knowledge_agent.label, "start")
                knowledge_out, dt = await _run_stage(request_id, knowledge_agent.name, knowledge_agent.run(ctx))
                ctx["knowledge_retrieval"] = knowledge_out
                trace.append({"agent": knowledge_agent.name, "duration_ms": dt})
                yield _step_event(knowledge_agent.name, knowledge_agent.label, "complete", knowledge_out, dt)

            reply_agent = ChatReplyAgent(llm)
            yield _step_event(reply_agent.name, reply_agent.label, "start")
            reply_out, dt = await _run_stage(request_id, reply_agent.name, reply_agent.run(ctx))
            trace.append({"agent": reply_agent.name, "duration_ms": dt})
            yield _step_event(reply_agent.name, reply_agent.label, "complete", reply_out, dt)
            yield {
                "type": "final",
                "data": _build_reply_response(
                    ctx,
                    reply_out["reply"],
                    reply_out.get("follow_up_suggestions", []),
                    trace,
                    bool(reply_out.get("suggest_help")),
                ),
            }
            logger.info("[%s] pipeline=chat status=complete outcome=conversational", request_id)
            return

        # 3. Knowledge Retrieval — semantic search over the curated knowledge
        # base; its output is handed to Symptom Analysis / Women's Health below
        # as grounding context, and feeds the final response's sources[].
        knowledge_agent = KnowledgeRetrievalAgent(llm)
        yield _step_event(knowledge_agent.name, knowledge_agent.label, "start")
        knowledge_out, dt = await _run_stage(request_id, knowledge_agent.name, knowledge_agent.run(ctx))
        ctx["knowledge_retrieval"] = knowledge_out
        trace.append({"agent": knowledge_agent.name, "duration_ms": dt})
        yield _step_event(knowledge_agent.name, knowledge_agent.label, "complete", knowledge_out, dt)
        logger.info(
            "[%s] stage=knowledge_retrieval query=%r chunks_returned=%d",
            request_id, knowledge_out.get("query"), len(knowledge_out.get("chunks", [])),
        )

        # 4. Symptom Analysis + Women's Health, in parallel where relevant.
        invoke = intake_out.get("invoke_agents", {})
        parallel_agents = []
        if invoke.get("symptom_analysis", True):
            parallel_agents.append(SymptomAnalysisAgent(llm))
        if invoke.get("womens_health", False):
            parallel_agents.append(WomensHealthAgent(llm))

        for agent in parallel_agents:
            yield _step_event(agent.name, agent.label, "start")

        tasks = {agent.name: asyncio.create_task(_run_stage(request_id, agent.name, agent.run(ctx))) for agent in parallel_agents}
        labels = {agent.name: agent.label for agent in parallel_agents}
        for name, task in tasks.items():
            out, dt = await task
            ctx[name] = out
            trace.append({"agent": name, "duration_ms": dt})
            yield _step_event(name, labels[name], "complete", out, dt)

        # 5. Risk Assessment
        risk_agent = RiskAssessmentAgent(llm)
        yield _step_event(risk_agent.name, risk_agent.label, "start")
        risk_out, dt = await _run_stage(request_id, risk_agent.name, risk_agent.run(ctx))
        ctx["risk_assessment"] = risk_out
        trace.append({"agent": risk_agent.name, "duration_ms": dt})
        yield _step_event(risk_agent.name, risk_agent.label, "complete", risk_out, dt)

        # 6. Safety gate — final check before Care Planner, can still short-circuit.
        yield _step_event("safety_gate", "Final safety check", "start")
        safety_post, dt = await _run_stage(request_id, "safety_gate", safety_agent.run(ctx))
        trace.append({"agent": "safety_gate", "duration_ms": dt})
        yield _step_event("safety_gate", "Final safety check", "complete", safety_post, dt)

        if safety_post["emergency"]:
            result = _build_emergency_response(ctx, safety_post, trace)
            yield {"type": "emergency", "data": safety_post}
            yield {"type": "final", "data": result}
            logger.info("[%s] pipeline=chat status=complete outcome=emergency_gate", request_id)
            return

        # 7. Care Planner
        care_agent = CarePlannerAgent(llm)
        yield _step_event(care_agent.name, care_agent.label, "start")
        care_out, dt = await _run_stage(request_id, care_agent.name, care_agent.run(ctx))
        trace.append({"agent": care_agent.name, "duration_ms": dt})
        yield _step_event(care_agent.name, care_agent.label, "complete", care_out, dt)

        yield {"type": "final", "data": _build_final_response(ctx, care_out, trace)}
        total_ms = round((time.perf_counter() - t_pipeline_start) * 1000, 1)
        logger.info("[%s] pipeline=chat status=complete outcome=ok total_ms=%s", request_id, total_ms)
    except Exception:
        total_ms = round((time.perf_counter() - t_pipeline_start) * 1000, 1)
        logger.exception("[%s] pipeline=chat status=failed total_ms=%s", request_id, total_ms)
        raise
