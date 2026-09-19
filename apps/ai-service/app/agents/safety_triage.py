from __future__ import annotations

from app.agents.base import Agent
from app.utils import text_analysis as ta

EMERGENCY_MESSAGE = (
    "Based on what you've described, this could be a medical emergency. Please call your "
    "local emergency number or go to the nearest emergency room right now — do not wait to "
    "see if it gets better on its own."
)


class SafetyTriageAgent(Agent):
    """The hard gate.

    Deliberately NOT LLM-based: a safety-critical short-circuit shouldn't
    depend on a model's judgment (mock or real) being well-calibrated on any
    given call. It runs twice in the chat pipeline — once immediately after
    Intake, before the Symptom/Women's Health agents even start, and once
    again after Risk Assessment as a final gate before the Care Planner — and
    once in the document pipeline, after Risk Assessment. Any trip stops the
    pipeline and returns only the emergency message.

    A document/lab-report run additionally checks `extracted_values` directly
    for a critical_low/critical_high status — a critical lab value is enough
    to trigger the gate on its own, independent of the risk_level escalation
    path used by chat.
    """

    name = "safety_triage"
    label = "Running safety check"

    async def run(self, ctx: dict) -> dict:
        check = ta.detect_emergency(ctx.get("message", ""))
        risk_assessment = ctx.get("risk_assessment") or {}
        escalated_by_risk = risk_assessment.get("risk_level") == "urgent"
        critical_values = [
            v for v in (ctx.get("extracted_values") or []) if v.get("status") in ("critical_low", "critical_high")
        ]

        if check.is_emergency or escalated_by_risk or critical_values:
            matched_signals = check.matched_signals or [
                f"{v['parameter']}: {v['value']} {v.get('unit') or ''} ({v['status'].replace('_', ' ')})".strip()
                for v in critical_values
            ]
            category = check.category or ("critical_lab_value" if critical_values else "risk_assessment_escalation")
            return {
                "emergency": True,
                "matched_signals": matched_signals,
                "category": category,
                "message": EMERGENCY_MESSAGE,
                "recommended_action": "Seek immediate in-person or emergency medical care.",
            }

        return {
            "emergency": False,
            "matched_signals": [],
            "category": None,
            "message": None,
            "recommended_action": None,
        }
