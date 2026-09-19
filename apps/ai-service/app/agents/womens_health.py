from __future__ import annotations

import json

from app.agents.base import USER_VOICE, Agent
from app.utils.json_utils import safe_json_loads

SYSTEM_PROMPT = """You are the Women's Health Intelligence Agent in HERAI, a multi-agent
women's health assistant.

You layer menstrual, cycle, and reproductive-health context onto the user's
symptoms when relevant: cycle irregularity, PCOS-pattern indicators,
anemia-risk indicators, and other hormonal patterns. Only run substantively
when the query or profile suggests cycle/hormonal relevance — otherwise
return relevant=false.

You may also receive `extracted_values` from an uploaded lab report (e.g.
Hemoglobin, Ferritin, TSH, LH, FSH, Testosterone, Estradiol). An abnormal
result in one of these should surface as its own indicator using the same
non-diagnostic phrasing — e.g. a low Hemoglobin/Ferritin as an anemia-risk
indicator, an abnormal TSH as a thyroid-pattern indicator, abnormal
LH/FSH/Testosterone as a PCOS-pattern indicator worth discussing.

You may also receive `retrieved_knowledge` — passages retrieved from a
curated knowledge base by the Knowledge Retrieval Agent. Use it as grounding
context when relevant; don't invent claims beyond what it or the user's own
data supports.

Use the same non-diagnostic phrasing as the rest of the pipeline: "may be
associated with", "could be worth discussing with a clinician". Never state a
confirmed diagnosis (e.g. never assert the user "has PCOS").

Respond with ONLY a JSON object, no markdown fences, no commentary, matching
exactly this schema:
{
  "relevant": bool,
  "summary": string,
  "indicators": [{"pattern": string, "note": string}],
  "possible_factors": [string],
  "follow_up_questions": [string],
  "needs_clinician": bool
}
"""


class WomensHealthAgent(Agent):
    name = "womens_health"
    label = "Checking cycle & hormonal patterns"

    async def run(self, ctx: dict) -> dict:
        intake = ctx.get("intake") or {}
        profile = ctx.get("health_profile") or {}
        extracted = intake.get("extracted", {})
        knowledge = ctx.get("knowledge_retrieval") or {}
        input_data = {
            "symptoms": extracted.get("symptoms", []),
            "raw_query": ctx.get("message", ""),
            "cycle_length_days": profile.get("cycleLengthDays"),
            "last_period_start": profile.get("lastPeriodStart"),
            "age_range": profile.get("ageRange"),
            "known_conditions": profile.get("knownConditions", []),
            "extracted_values": ctx.get("extracted_values"),
            "retrieved_knowledge": [
                {"title": c["title"], "topic": c["topic"], "text": c["text"]} for c in knowledge.get("chunks", [])
            ],
        }
        prompt = f"Assess menstrual/cycle/reproductive-health relevance.\n\nINPUT_JSON:\n{json.dumps(input_data)}"
        raw = await self.llm.generate(system=SYSTEM_PROMPT + USER_VOICE, prompt=prompt, agent=self.name)
        return safe_json_loads(raw)
