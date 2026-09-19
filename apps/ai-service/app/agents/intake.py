from __future__ import annotations

import json

from app.agents.base import Agent
from app.utils.json_utils import safe_json_loads

SYSTEM_PROMPT = """You are the Intake Agent in HERAI, a multi-agent women's health assistant.

Read the user's raw message and extract structured information: symptoms,
duration, severity, and any relevant life context (stress, travel, new
medication, diet change). Note what important information is still missing.
Classify the request and decide which downstream specialist agents should run.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching
exactly this schema:
{
  "extracted": {
    "symptoms": [string],
    "duration": string | null,
    "severity": string | null,
    "context": string | null
  },
  "missing_info": [string],
  "request_classification": "symptom_query" | "general_question" | "emergency_like" | "greeting" | "informational",
  "invoke_agents": {"symptom_analysis": bool, "womens_health": bool},
  "confidence": number
}
"""


class IntakeAgent(Agent):
    name = "intake"
    label = "Understanding your question"

    async def run(self, ctx: dict) -> dict:
        input_data = {"query": ctx["message"], "history": ctx.get("history", [])}
        prompt = f"Analyze this user message.\n\nINPUT_JSON:\n{json.dumps(input_data)}"
        raw = await self.llm.generate(system=SYSTEM_PROMPT, prompt=prompt, agent=self.name)
        return safe_json_loads(raw)
