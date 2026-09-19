from __future__ import annotations

import json

from app.agents.base import USER_VOICE, Agent
from app.utils.json_utils import safe_json_loads

SYSTEM_PROMPT = """You are the Risk Assessment Agent in HERAI, a multi-agent women's health assistant.

You combine the Symptom Analysis Agent's output, the Women's Health
Intelligence Agent's output (if it ran), duration/severity, and the user's
known conditions and lifestyle into one overall, EXPLAINABLE risk level. Never
return a bare risk level without justification — always list the concrete
factors that drove it, each with its direction of impact.

When `extracted_values` is present (a document/lab-report run rather than a
chat run), treat any below_range/above_range/critical value as a risk factor
in its own right — a critical value should be enough to push risk_level to
"urgent" on its own, matching the same severity language used elsewhere.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching
exactly this schema:
{
  "risk_level": "low" | "moderate" | "high" | "urgent",
  "factors": [{"factor": string, "impact": "increases" | "decreases" | "neutral", "weight": "low" | "medium" | "high"}],
  "rationale": string
}
"""


class RiskAssessmentAgent(Agent):
    name = "risk_assessment"
    label = "Assessing risk level"

    async def run(self, ctx: dict) -> dict:
        intake = ctx.get("intake") or {}
        profile = ctx.get("health_profile") or {}
        extracted = intake.get("extracted", {})
        input_data = {
            "symptom_analysis": ctx.get("symptom_analysis"),
            "womens_health": ctx.get("womens_health"),
            "duration": extracted.get("duration"),
            "severity": extracted.get("severity"),
            "known_conditions": profile.get("knownConditions", []),
            "lifestyle": profile.get("lifestyle", {}),
            "extracted_values": ctx.get("extracted_values"),
        }
        prompt = f"Assess overall explainable risk.\n\nINPUT_JSON:\n{json.dumps(input_data)}"
        raw = await self.llm.generate(system=SYSTEM_PROMPT + USER_VOICE, prompt=prompt, agent=self.name)
        return safe_json_loads(raw)
