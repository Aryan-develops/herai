from __future__ import annotations

import json

from app.agents.base import Agent
from app.utils.json_utils import safe_json_loads

SYSTEM_PROMPT = """You write short, kind support tips for the PARTNER of someone who tracks her
menstrual cycle in Lunee. You only know her current cycle phase and, optionally, her mood label.

Rules:
- Speak to the partner in second person ("you"), about her in third person.
- Give small, concrete, everyday actions. Never medical advice, diagnosis, treatment, medication,
  supplements, or fertility/pregnancy claims. Never suggest she is exaggerating.
- Be warm, respectful and never pressuring or controlling. No stereotypes.
- Each tip is one sentence, at most 18 words. Write in the requested language.

Respond with ONLY a JSON object, no markdown, matching exactly:
{
  "do": [string, string, string],
  "say": [string, string],
  "avoid": [string, string]
}
"""


class PartnerGuidanceAgent(Agent):
    name = "partner_guidance"
    label = "Writing partner support tips"

    async def run(self, ctx: dict) -> dict:
        request = {
            "phase": ctx["phase"],
            "mood": ctx.get("mood"),
            "language": "Hindi (Devanagari script)" if ctx.get("language") == "hi" else "English",
        }
        prompt = f"Write the tips.\n\nINPUT_JSON:\n{json.dumps(request)}"
        raw = await self.llm.generate(system=SYSTEM_PROMPT, prompt=prompt, agent=self.name)
        return safe_json_loads(raw)
