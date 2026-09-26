"""MockLLMProvider — plausible, varied, schema-shaped responses with zero API cost.

Real providers would read the whole `prompt` as natural language. This mock
instead recovers the structured `INPUT_JSON` block each agent embeds in its
prompt (see app/utils/json_utils.extract_input_json) and runs small,
explainable heuristics over it — deterministic per request (so a demo run is
reproducible) but varied across different symptoms/durations/severities so it
doesn't read as one canned string. This is intentionally simple: the point is
to prove the multi-agent contract end-to-end under DEMO_MODE=true, not to
simulate a language model.
"""

from __future__ import annotations

import hashlib
import json
import logging
import random
from typing import AsyncIterator

from app.config import settings
from app.llm.base import LLMProvider
from app.utils import text_analysis as ta
from app.utils.json_utils import extract_input_json

logger = logging.getLogger("herai.llm.mock")


def _count_or_none(value) -> int | None:
    """len() for a present list, None for an absent field — the two mean
    different things when debugging (`[]` = arrived empty, missing = never
    passed) and that distinction is the point of logging it at all."""
    return None if value is None else len(value)

_RISK_ORDER = ["low", "moderate", "high", "urgent"]

_FACTOR_POOL: dict[str, list[str]] = {
    "fatigue": [
        "iron levels running lower than usual",
        "sleep quality and consistency",
        "thyroid function",
        "overall stress load",
        "vitamin D or B12 status",
    ],
    "headache": [
        "hydration levels",
        "sleep pattern changes",
        "screen time or eye strain",
        "tension or stress",
        "hormonal fluctuations across your cycle",
    ],
    "cramps": [
        "typical menstrual cramping",
        "hormonal fluctuations across your cycle",
        "muscle tension",
    ],
    "nausea": ["digestive sensitivity", "recent diet changes", "hormonal fluctuations", "stress"],
    "dizziness": ["blood pressure changes", "hydration levels", "iron levels running lower than usual", "inner-ear balance"],
    "bloating": ["digestive patterns", "hormonal fluctuations across your cycle", "recent diet changes"],
    "mood changes": ["hormonal fluctuations across your cycle", "sleep quality", "overall stress load"],
    "acne": ["hormonal fluctuations", "skincare or product changes", "diet patterns"],
    "hair loss": ["thyroid function", "iron levels running lower than usual", "hormonal fluctuations", "stress load"],
    "sleep disturbance": ["stress load", "caffeine or screen habits before bed", "hormonal fluctuations"],
    "abnormal bleeding": ["hormonal fluctuations", "cycle irregularity", "iron levels running lower than usual"],
    "fever": ["an underlying infection", "recent illness exposure"],
    "weight change": ["thyroid function", "hormonal fluctuations", "appetite and stress patterns"],
    "hot flashes": ["hormonal fluctuations", "perimenopausal-pattern changes"],
    "brain fog": ["sleep quality", "stress load", "thyroid function", "iron levels running lower than usual"],
    "hirsutism": ["hormonal patterns worth reviewing with a clinician"],
    "irregular cycle": ["hormonal fluctuations", "stress load", "significant weight or activity changes"],
    "breast tenderness": ["hormonal fluctuations across your cycle"],
    "pain": ["muscle or joint strain", "tension", "an underlying pattern worth tracking"],
}
_DEFAULT_FACTORS = ["overall stress load", "recent lifestyle changes", "sleep and hydration patterns"]

_TODAY_TIPS: dict[str, str] = {
    "fatigue": "Note what time of day the tiredness is worst and whether rest helps.",
    "headache": "Track when the headache started and anything unusual you ate, drank, or did today.",
    "cramps": "Try gentle heat on the area and note how the cramping compares to previous cycles.",
    "nausea": "Sip water slowly and eat small, plain portions rather than large meals.",
    "dizziness": "Sit or lie down when the dizziness hits, and avoid sudden standing.",
    "bloating": "Note what you ate before the bloating started.",
    "mood changes": "Jot down what was happening when the mood shift started.",
    "sleep disturbance": "Avoid screens for an hour before bed tonight.",
    "abnormal bleeding": "Note how many pads/tampons you're using per day for your clinician conversation.",
    "fever": "Keep track of your temperature through the day and rest.",
}
_DEFAULT_TODAY_TIP = "Write down exactly when this started and how it's changed since."


def _seeded_random(data: dict) -> random.Random:
    seed_bytes = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
    seed = int(hashlib.sha256(seed_bytes).hexdigest(), 16)
    return random.Random(seed)


def _pick(rng: random.Random, pool: list[str], k: int) -> list[str]:
    k = min(k, len(pool))
    return rng.sample(pool, k)


def _worse(a: str, b: str) -> str:
    return a if _RISK_ORDER.index(a) >= _RISK_ORDER.index(b) else b


class MockLLMProvider(LLMProvider):
    # Hashed bag-of-words, not a dense model — its own vector space, with its
    # own committed index and its own similarity threshold.
    embedding_space = "bow-4096"

    async def generate(self, *, system: str, prompt: str, agent: str) -> str:
        # The exact prompt string handed to the provider, INPUT_JSON block
        # included — ground truth for "is personalization data (HealthProfile,
        # symptoms, retrieved knowledge) actually reaching the LLM layer".
        # It also contains the user's health data verbatim, so it is gated
        # behind LOG_HEALTH_DATA; the shape-only line below stays always-on so
        # the same question is still answerable without leaking content.
        if settings.log_health_data:
            logger.debug("agent=%s prompt=%s", agent, prompt)

        input_data = extract_input_json(prompt)
        if not input_data and "INPUT_JSON:" in prompt:
            # The prompt DOES contain an INPUT_JSON block but extraction came back
            # empty — every downstream `.get(...)` will silently fall back to its
            # default, which is exactly what a "generic answer that ignores my
            # data" looks like from the outside. This is the canary for that bug.
            logger.warning("agent=%s extract_input_json returned {} despite an INPUT_JSON block in the prompt", agent)
        # Counts, not values: still shows whether personalization data arrived
        # (the thing worth monitoring) without writing health content to disk.
        logger.info(
            "agent=%s input_keys=%s symptom_count=%s known_condition_count=%s retrieved_chunks=%d",
            agent,
            sorted(input_data.keys()),
            _count_or_none(input_data.get("symptoms")),
            _count_or_none(input_data.get("known_conditions")),
            len(input_data.get("retrieved_knowledge") or []),
        )
        if settings.log_health_data:
            logger.debug(
                "agent=%s symptoms=%s known_conditions=%s",
                agent,
                input_data.get("symptoms"),
                input_data.get("known_conditions"),
            )

        handler = getattr(self, f"_mock_{agent}", None)
        if handler is None:
            logger.warning("agent=%s has no registered mock handler — falling back to a stub response", agent)
            return json.dumps({"note": f"no mock handler registered for agent '{agent}'"})

        try:
            result = handler(input_data)
        except Exception:
            # Keys only — the traceback plus the shape of the input is enough to
            # localize the bug without dumping the user's health data.
            logger.exception("agent=%s mock handler raised — input_keys=%s", agent, sorted(input_data.keys()))
            raise
        if settings.log_health_data:
            logger.debug("agent=%s result=%s", agent, result)
        return json.dumps(result)

    async def generate_stream(self, *, system: str, prompt: str, agent: str) -> AsyncIterator[str]:
        text = await self.generate(system=system, prompt=prompt, agent=agent)
        chunk_size = 48
        for i in range(0, len(text), chunk_size):
            yield text[i : i + chunk_size]

    async def analyze_image(self, *, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        return json.dumps(
            {
                "note": "MockLLMProvider does not perform real vision analysis.",
                "placeholder_finding": "No abnormalities flagged in this demo response.",
                "bytes_received": len(image_bytes),
            }
        )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._bag_of_words_embedding(t) for t in texts]

    @staticmethod
    def _bag_of_words_embedding(text: str, dims: int = 4096) -> list[float]:
        """Hashed bag-of-words embedding — NOT a real semantic embedding, but
        (unlike hashing the whole string into one opaque digest) it puts two
        texts that share meaningful vocabulary close together in vector
        space, which is what retrieval actually needs. Each token hashes to
        one of `dims` buckets (the "hashing trick"); a real provider would
        swap this for a genuine sentence embedding without any agent code
        needing to change, since callers only ever see a list[float].
        """
        vec = [0.0] * dims
        for token in ta.TOKEN_PATTERN.findall(text.lower()):
            if len(token) < 3 or token in ta.STOPWORDS:
                continue
            bucket = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16) % dims
            vec[bucket] += 1.0
        norm = sum(v * v for v in vec) ** 0.5 or 1.0
        return [v / norm for v in vec]

    # ------------------------------------------------------------------
    # Per-agent mock generators
    # ------------------------------------------------------------------

    def _mock_chat_reply(self, data: dict) -> dict:
        message = (data.get("message") or "").strip()
        if len(message) < 25 and not data.get("retrieved_knowledge"):
            return {
                "reply": "Hi, I'm here. Tell me how you're feeling today, or ask me anything about your cycle or health.",
                "follow_up_suggestions": ["Why is my period late?", "What can help with cramps?"],
                "suggest_help": False,
            }
        chunks = data.get("retrieved_knowledge") or []
        reply = chunks[0]["text"][:280] + "..." if chunks else "Good question. Tell me a bit more so I can help properly."
        return {"reply": reply, "follow_up_suggestions": [], "suggest_help": False}

    def _mock_intake(self, data: dict) -> dict:
        query = data.get("query", "")
        symptoms = ta.extract_symptoms(query)
        duration = ta.extract_duration(query)
        severity = ta.extract_severity(query)
        context = ta.extract_context(query)
        emergency = ta.detect_emergency(query)
        classification = ta.classify_request(query, symptoms, emergency.is_emergency)

        missing_info = []
        if not duration:
            missing_info.append("duration")
        if not severity:
            missing_info.append("severity")
        if not symptoms:
            missing_info.append("specific symptoms")

        womens_health_relevant = ta.is_womens_health_relevant(query, symptoms)

        confidence = 0.9
        if not duration:
            confidence -= 0.15
        if not severity:
            confidence -= 0.15
        if not symptoms:
            confidence -= 0.25
        confidence = max(0.35, round(confidence, 2))

        return {
            "extracted": {
                "symptoms": symptoms,
                "duration": duration,
                "severity": severity,
                "context": context,
            },
            "missing_info": missing_info,
            "request_classification": classification,
            "invoke_agents": {
                # NOT just bool(symptoms): a substantive personal statement
                # with no regex-matched keyword ("I don't feel like myself
                # lately") still deserves a reasoned response grounded in the
                # user's own words + HealthProfile. Only skip Symptom
                # Analysis for a pure factual question or a bare greeting,
                # where there's genuinely nothing personal to analyze — a bug
                # fix: previously this was effectively `bool(symptoms)` only
                # (classification == "symptom_query" is set exactly when
                # symptoms is truthy, so the OR added nothing), which meant
                # ANY message our finite symptom-keyword list didn't
                # recognize skipped Symptom Analysis entirely and produced a
                # bare, unexplained risk/care-plan response.
                "symptom_analysis": classification not in ("general_question", "greeting"),
                "womens_health": womens_health_relevant,
            },
            "confidence": confidence,
        }

    def _mock_symptom_analysis(self, data: dict) -> dict:
        symptoms: list[str] = data.get("symptoms") or []
        duration = data.get("duration")
        severity = data.get("severity")
        known_conditions: list[str] = data.get("known_conditions") or []
        rng = _seeded_random(data)

        if symptoms:
            symptom_text = ", ".join(symptoms)
        else:
            symptom_text = "what you've described"
        summary = f"You've reported {symptom_text}"
        if duration:
            summary += f" for about {duration}"
        if severity:
            summary += f", described as {severity}"
        summary += (
            ". This may be associated with a few different everyday factors — "
            "none of these are a diagnosis, just things that could be worth discussing with a clinician."
        )
        if known_conditions:
            summary += f" Given your history of {', '.join(known_conditions[:2])}, this is worth flagging to your clinician rather than assuming it's unrelated."

        retrieved: list[dict] = data.get("retrieved_knowledge") or []
        if retrieved:
            titles = list(dict.fromkeys(r["title"] for r in retrieved))[:2]
            summary += f" Background from our knowledge base ({', '.join(titles)}) is reflected below — see sources for details."

        possible_factors: list[str] = []
        for symptom in symptoms or ["general"]:
            pool = _FACTOR_POOL.get(symptom, _DEFAULT_FACTORS)
            for factor in _pick(rng, pool, 2):
                if factor not in possible_factors:
                    possible_factors.append(factor)
        possible_factors = possible_factors[:5] or _DEFAULT_FACTORS

        risk_level = "low"
        if severity == "severe":
            risk_level = "high"
        elif severity == "moderate":
            risk_level = "moderate"

        long_duration = bool(duration) and any(u in duration for u in ("week", "month", "year"))
        if long_duration and severity in ("moderate", "severe"):
            risk_level = _worse(risk_level, "high")

        high_risk_combo = {"abnormal bleeding", "dizziness"}.issubset(set(symptoms)) or {
            "fatigue",
            "weight change",
            "irregular cycle",
        }.issubset(set(symptoms))
        if high_risk_combo:
            risk_level = _worse(risk_level, "moderate")

        if known_conditions:
            risk_level = _worse(risk_level, "moderate")

        needs_clinician = risk_level in ("moderate", "high", "urgent") or (
            long_duration and not severity
        )

        follow_ups = []
        if not duration:
            follow_ups.append("About how long has this been going on?")
        if not severity:
            follow_ups.append("On a scale of mild, moderate, or severe, how would you describe it?")
        follow_ups.append("Has this affected your daily activities or sleep?")
        if "cramps" in symptoms or "abnormal bleeding" in symptoms or "irregular cycle" in symptoms:
            follow_ups.append("Have you noticed any patterns related to your menstrual cycle?")
        follow_ups.append("Are you taking any new medications or supplements recently?")
        follow_ups = follow_ups[:4]

        next_steps_by_level = {
            "low": [
                "Track when it happens and anything that seems to trigger or ease it",
                "Stay hydrated and prioritize consistent sleep this week",
                "Re-check in about a week if it persists or changes",
            ],
            "moderate": [
                "Keep a daily log of the symptom, its severity, and any triggers",
                "Consider scheduling a routine appointment with your clinician to discuss it",
                "Watch for any worsening or new symptoms in the meantime",
            ],
            "high": [
                "Book an appointment with a clinician soon — within the next few days",
                "Keep a detailed log to share at that appointment",
                "Seek care sooner if symptoms worsen or new ones appear",
            ],
            "urgent": [
                "This should be discussed with a clinician as soon as possible",
            ],
        }

        return {
            "summary": summary,
            "possible_factors": possible_factors,
            "risk_level": risk_level,
            "follow_up_questions": follow_ups,
            "recommended_next_steps": next_steps_by_level[risk_level],
            "needs_clinician": needs_clinician,
        }

    def _mock_womens_health(self, data: dict) -> dict:
        symptoms: list[str] = data.get("symptoms") or []
        cycle_length_days = data.get("cycle_length_days")
        extracted_values = data.get("extracted_values") or []
        rng = _seeded_random(data)

        abnormal_lab_values = [v for v in extracted_values if v.get("status") not in ("in_range", "unparseable", None)]
        relevant = (
            ta.is_womens_health_relevant(data.get("raw_query", ""), symptoms)
            or bool(cycle_length_days)
            or bool(abnormal_lab_values)
        )
        if not relevant:
            return {
                "relevant": False,
                "summary": "No menstrual or reproductive-health-specific patterns were flagged for this query.",
                "indicators": [],
                "possible_factors": [],
                "follow_up_questions": [],
                "needs_clinician": False,
            }

        indicators = []
        if isinstance(cycle_length_days, (int, float)) and (cycle_length_days < 21 or cycle_length_days > 35):
            indicators.append(
                {
                    "pattern": "cycle length outside the typical 21-35 day range",
                    "note": "This cycle-length pattern could be worth discussing with a clinician — it may be associated with hormonal fluctuations.",
                }
            )
        pcos_signals = {"irregular cycle", "acne", "hirsutism", "weight change"}
        if len(pcos_signals.intersection(symptoms)) >= 2:
            indicators.append(
                {
                    "pattern": "PCOS-pattern indicators",
                    "note": "This combination may be associated with PCOS-pattern indicators — not a diagnosis, but worth raising with a clinician.",
                }
            )
        anemia_signals = {"fatigue", "dizziness", "abnormal bleeding"}
        if len(anemia_signals.intersection(symptoms)) >= 2:
            indicators.append(
                {
                    "pattern": "anemia-risk indicators",
                    "note": "Fatigue combined with dizziness and/or heavier bleeding could be associated with anemia-risk indicators — a simple blood test can check this.",
                }
            )
        hormonal_signals = {"mood changes", "hot flashes", "bloating", "breast tenderness"}
        if hormonal_signals.intersection(symptoms):
            indicators.append(
                {
                    "pattern": "hormonal pattern",
                    "note": "These symptoms may be associated with normal hormonal fluctuations across your cycle.",
                }
            )

        lab_by_param = {v["parameter"]: v for v in abnormal_lab_values}
        if "Hemoglobin" in lab_by_param or "Ferritin" in lab_by_param:
            v = lab_by_param.get("Hemoglobin") or lab_by_param["Ferritin"]
            indicators.append(
                {
                    "pattern": "anemia-risk indicators",
                    "note": f"{v['parameter']} at {v.get('value')} {v.get('unit') or ''} ({v['status'].replace('_', ' ')}) may be associated with anemia-risk indicators — worth discussing with a clinician, especially alongside heavy or irregular periods.",
                }
            )
        if "TSH" in lab_by_param:
            v = lab_by_param["TSH"]
            indicators.append(
                {
                    "pattern": "thyroid pattern",
                    "note": f"TSH at {v.get('value')} {v.get('unit') or ''} ({v['status'].replace('_', ' ')}) may be associated with a thyroid pattern worth discussing with a clinician — thyroid function can affect cycles, weight, and energy.",
                }
            )
        pcos_lab_hits = {p for p in ("LH", "FSH", "Testosterone", "Estradiol") if p in lab_by_param}
        if pcos_lab_hits:
            detail = ", ".join(f"{lab_by_param[p]['parameter']} {lab_by_param[p].get('value')} {lab_by_param[p].get('unit') or ''}".strip() for p in pcos_lab_hits)
            indicators.append(
                {
                    "pattern": "PCOS-pattern indicators",
                    "note": f"{detail} may be associated with PCOS-pattern indicators — not a diagnosis, but worth raising with a clinician.",
                }
            )

        possible_factors = []
        for ind in indicators:
            possible_factors.extend(_pick(rng, _FACTOR_POOL.get("irregular cycle", _DEFAULT_FACTORS), 1))
        possible_factors = list(dict.fromkeys(possible_factors)) or ["hormonal fluctuations across your cycle"]

        follow_ups = [
            "How long is your typical cycle length currently?",
            "Have you noticed any changes in flow heaviness?",
        ]
        if "acne" in symptoms or "hirsutism" in symptoms:
            follow_ups.append("Any new hair growth or acne changes recently?")

        summary = "A few cycle- and hormone-related patterns showed up alongside what you reported — none of these are diagnoses."
        retrieved: list[dict] = data.get("retrieved_knowledge") or []
        if retrieved:
            titles = list(dict.fromkeys(r["title"] for r in retrieved))[:2]
            summary += f" Grounded in background from our knowledge base ({', '.join(titles)}) — see sources for details."

        return {
            "relevant": True,
            "summary": summary,
            "indicators": indicators,
            "possible_factors": possible_factors,
            "follow_up_questions": follow_ups[:3],
            "needs_clinician": len(indicators) > 0,
        }

    def _mock_risk_assessment(self, data: dict) -> dict:
        symptom_analysis = data.get("symptom_analysis") or {}
        womens_health = data.get("womens_health") or {}
        known_conditions = data.get("known_conditions") or []
        lifestyle = data.get("lifestyle") or {}
        extracted_values = data.get("extracted_values") or []

        risk_level = symptom_analysis.get("risk_level", "low")
        factors = []

        for v in extracted_values:
            status = v.get("status")
            if status in ("in_range", "unparseable", None):
                continue
            label = f"{v['parameter']}: {v.get('value')} {v.get('unit') or ''}".strip()
            if status in ("critical_low", "critical_high"):
                factors.append({"factor": f"{label} — critically {'low' if status == 'critical_low' else 'high'}", "impact": "increases", "weight": "high"})
                risk_level = "urgent"
            else:
                factors.append({"factor": f"{label} — {status.replace('_', ' ')}", "impact": "increases", "weight": "medium"})
                risk_level = _worse(risk_level, "moderate")

        severity = data.get("severity")
        if severity:
            impact = "increases" if severity in ("moderate", "severe") else "neutral"
            factors.append({"factor": f"Reported severity: {severity}", "impact": impact, "weight": "high" if severity == "severe" else "medium"})

        duration = data.get("duration")
        if duration:
            long_duration = any(u in duration for u in ("week", "month", "year"))
            factors.append(
                {
                    "factor": f"Duration: {duration}",
                    "impact": "increases" if long_duration else "neutral",
                    "weight": "medium" if long_duration else "low",
                }
            )

        for indicator in womens_health.get("indicators", []):
            factors.append({"factor": indicator["pattern"], "impact": "increases", "weight": "medium"})
            risk_level = _worse(risk_level, "moderate")

        if known_conditions:
            factors.append(
                {
                    "factor": f"Existing condition(s) on file: {', '.join(known_conditions[:3])}",
                    "impact": "increases",
                    "weight": "medium",
                }
            )
            risk_level = _worse(risk_level, "moderate")

        if lifestyle.get("exerciseFrequency") in ("moderate", "active"):
            factors.append({"factor": "Regular exercise habits", "impact": "decreases", "weight": "low"})
        if lifestyle.get("sleepHoursAvg") and lifestyle["sleepHoursAvg"] >= 7:
            factors.append({"factor": "Healthy average sleep duration", "impact": "decreases", "weight": "low"})

        if not factors:
            factors.append({"factor": "No strong risk signals identified from the information given", "impact": "neutral", "weight": "low"})

        rationale = (
            f"Overall risk is assessed as '{risk_level}' based on {len(factors)} factor(s) below — "
            "this combines the symptom analysis, any cycle/hormonal indicators, and your health profile. "
            "This is a risk-awareness estimate, not a diagnosis."
        )

        return {"risk_level": risk_level, "factors": factors, "rationale": rationale}

    def _mock_care_planner(self, data: dict) -> dict:
        symptom_analysis = data.get("symptom_analysis") or {}
        womens_health = data.get("womens_health") or {}
        risk_assessment = data.get("risk_assessment") or {}
        document_intelligence = data.get("document_intelligence") or {}
        extracted_values = data.get("extracted_values") or []
        symptoms: list[str] = data.get("symptoms") or []

        today = []
        for symptom in symptoms[:2]:
            today.append(_TODAY_TIPS.get(symptom, _DEFAULT_TODAY_TIP))
        abnormal_values = [v for v in extracted_values if v.get("status") not in ("in_range", "unparseable", None)]
        if abnormal_values:
            names = ", ".join(v["parameter"] for v in abnormal_values[:3])
            today.append(f"Re-read the {names} result(s) on your report and note any symptoms that might connect to them.")
        if not today:
            today.append(_DEFAULT_TODAY_TIP)
        today.append("Log this in Lunee's timeline so it's easy to spot patterns later.")

        this_week = [
            "Keep tracking symptoms daily — note severity, timing, and any triggers.",
        ]
        risk_level = risk_assessment.get("risk_level", "low")
        if risk_level in ("moderate", "high", "urgent"):
            this_week.append("Schedule an appointment with your clinician to discuss these symptoms.")
        else:
            this_week.append("Re-check how things look in about a week; escalate sooner if it worsens.")
        if data.get("medications"):
            this_week.append("Note any recent changes to medications or supplements for your clinician.")
        if extracted_values:
            this_week.append("Bring the original report (or a copy) to your next clinician visit.")

        discuss_topics = list(symptom_analysis.get("possible_factors", []))
        discuss_topics += [ind["pattern"] for ind in womens_health.get("indicators", [])]
        discuss_topics = list(dict.fromkeys(discuss_topics))[:5]
        discuss_with_clinician = [f"Ask about: {topic}" for topic in discuss_topics]

        for v in abnormal_values:
            question = f"Ask: what does my {v['parameter']} of {v.get('value')} {v.get('unit') or ''} ({v['status'].replace('_', ' ')}) mean for me, and what's the next step?".replace("  ", " ")
            if question not in discuss_with_clinician:
                discuss_with_clinician.append(question)

        if not discuss_with_clinician:
            discuss_with_clinician = ["Share your symptom timeline at your next routine visit."]
        if document_intelligence.get("caveats"):
            discuss_with_clinician.append(f"Ask about: {document_intelligence['caveats'][0]}")
        if risk_level in ("high", "urgent"):
            discuss_with_clinician.insert(0, "Prioritize this conversation within the next few days.")

        return {"today": today[:3], "this_week": this_week[:3], "discuss_with_clinician": discuss_with_clinician[:6]}

    def _mock_document_intelligence(self, data: dict) -> dict:
        extracted_values: list[dict] = data.get("extracted_values") or []
        ocr_method = data.get("ocr_method")
        ocr_confidence = data.get("ocr_confidence") or 0.0
        ocr_warnings: list[str] = data.get("ocr_warnings") or []

        caveats = ["Reference ranges vary by lab, method, and demographic factors — use this as a starting point, not a final read."]
        caveats.extend(ocr_warnings)

        if not extracted_values:
            return {
                "explanation": (
                    "We couldn't confidently extract any recognized lab values from this document. "
                    "This can happen with scanned images, unusual report layouts, or low-resolution photos. "
                    "No values are shown below because none could be verified against the document text — "
                    "please double-check the original report yourself, or try re-uploading a clearer PDF."
                ),
                "confidence": "low",
                "needs_clinician": False,
                "caveats": caveats,
            }

        unparseable = [v for v in extracted_values if v["status"] == "unparseable"]
        abnormal = [v for v in extracted_values if v["status"] not in ("in_range", "unparseable")]
        critical = [v for v in extracted_values if v["status"] in ("critical_low", "critical_high")]

        lines = []
        for v in extracted_values:
            if v["status"] == "unparseable":
                lines.append(f"{v['parameter']} was found on the report but its value couldn't be parsed cleanly from the text — please check the original.")
                continue
            phrase = {
                "in_range": "within the typical reference range",
                "below_range": "below the typical reference range",
                "above_range": "above the typical reference range",
                "critical_low": "significantly below the typical reference range",
                "critical_high": "significantly above the typical reference range",
            }[v["status"]]
            range_txt = f" (reference: {v['reference_range']})" if v.get("reference_range") else ""
            lines.append(f"{v['parameter']} is {v.get('value')} {v.get('unit') or ''}{range_txt} — {phrase}.".replace("  ", " "))

        explanation = " ".join(lines)
        if abnormal:
            explanation += (
                " These results may be associated with a range of everyday and clinical factors — "
                "none of this is a diagnosis, and it's worth discussing with a clinician who has your full history."
            )
        else:
            explanation += " Everything extracted from this report falls within typical reference ranges."

        retrieved: list[dict] = data.get("retrieved_knowledge") or []
        if retrieved:
            titles = list(dict.fromkeys(r["title"] for r in retrieved))[:2]
            explanation += f" Background from our knowledge base ({', '.join(titles)}) is reflected above — see sources for details."

        if ocr_method == "pdf_text" and not unparseable:
            confidence = "high"
        elif unparseable or ocr_confidence < 0.5:
            confidence = "low"
        else:
            confidence = "medium"

        return {
            "explanation": explanation,
            "confidence": confidence,
            "needs_clinician": bool(abnormal) or bool(critical),
            "caveats": caveats,
        }
