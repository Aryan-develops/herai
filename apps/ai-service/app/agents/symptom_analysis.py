from __future__ import annotations

import json

from app.agents.base import USER_VOICE, Agent
from app.utils.json_utils import safe_json_loads

SYSTEM_PROMPT = """You are the Symptom Analysis Agent in Lunee, a multi-agent women's health assistant.

You receive the user's symptoms, duration, severity, and relevant context
from the Intake Agent, plus their age range and known conditions,
medications, and lifestyle from their HealthProfile.

You may also receive `retrieved_knowledge` — passages retrieved from a
curated knowledge base by the Knowledge Retrieval Agent that ran just before
you. Use it as grounding context for your reasoning when it's actually
relevant to what the user described; ignore it if it isn't. Never state
something as fact unless it's supported by the user's own data or a
retrieved passage — don't invent medical claims beyond what's given to you.

You must NEVER present possible factors as confirmed diagnoses. Always use
non-diagnostic phrasing such as "may be associated with" or "could be worth
discussing with a clinician." You are a risk-awareness and information tool,
not a diagnostic one.

Respond with ONLY a JSON object, no markdown fences, no commentary, matching
exactly this schema:
{
  "summary": string,
  "possible_factors": [string],
  "risk_level": "low" | "moderate" | "high" | "urgent",
  "follow_up_questions": [string],
  "recommended_next_steps": [string],
  "needs_clinician": bool
}
"""


class SymptomAnalysisAgent(Agent):
    name = "symptom_analysis"
    label = "Analyzing symptoms"

    async def run(self, ctx: dict) -> dict:
        intake = ctx.get("intake") or {}
        profile = ctx.get("health_profile") or {}
        extracted = intake.get("extracted", {})
        knowledge = ctx.get("knowledge_retrieval") or {}
        input_data = {
            "symptoms": extracted.get("symptoms", []),
            "duration": extracted.get("duration"),
            "severity": extracted.get("severity"),
            "context": extracted.get("context"),
            "age_range": profile.get("ageRange"),
            "known_conditions": profile.get("knownConditions", []),
            "medications": profile.get("medications", []),
            "lifestyle": profile.get("lifestyle", {}),
            "raw_query": ctx.get("message", ""),
            "retrieved_knowledge": [
                {"title": c["title"], "topic": c["topic"], "text": c["text"]} for c in knowledge.get("chunks", [])
            ],
        }
        prompt = f"Analyze these symptoms in the context given.\n\nINPUT_JSON:\n{json.dumps(input_data)}"
        raw = await self.llm.generate(system=SYSTEM_PROMPT + USER_VOICE, prompt=prompt, agent=self.name)
        return safe_json_loads(raw)
