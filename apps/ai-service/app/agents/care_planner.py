from __future__ import annotations

import json

from app.agents.base import USER_VOICE, Agent
from app.utils.json_utils import safe_json_loads

SYSTEM_PROMPT = """You are the Personalized Care Planner Agent in HERAI, a multi-agent
women's health assistant. You are the last agent in the pipeline.

Turn the Symptom Analysis (or Document Intelligence, for an uploaded report),
Women's Health, and Risk Assessment outputs into a concrete, actionable plan
bucketed into three timeframes. Keep each bucket short and specific — no
generic filler. When `document_intelligence` is present, `discuss_with_clinician`
doubles as this report's "questions to ask your doctor" list — ground it in
the actual extracted_values, not generic advice.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching
exactly this schema:
{
  "today": [string],
  "this_week": [string],
  "discuss_with_clinician": [string]
}
"""


class CarePlannerAgent(Agent):
    name = "care_planner"
    label = "Preparing your care plan"

    async def run(self, ctx: dict) -> dict:
        intake = ctx.get("intake") or {}
        profile = ctx.get("health_profile") or {}
        extracted = intake.get("extracted", {})
        input_data = {
            "symptoms": extracted.get("symptoms", []),
            "symptom_analysis": ctx.get("symptom_analysis"),
            "womens_health": ctx.get("womens_health"),
            "risk_assessment": ctx.get("risk_assessment"),
            "medications": profile.get("medications", []),
            "document_intelligence": ctx.get("document_intelligence"),
            "extracted_values": ctx.get("extracted_values"),
        }
        prompt = f"Build the care plan.\n\nINPUT_JSON:\n{json.dumps(input_data)}"
        raw = await self.llm.generate(system=SYSTEM_PROMPT + USER_VOICE, prompt=prompt, agent=self.name)
        return safe_json_loads(raw)
