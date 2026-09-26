from __future__ import annotations

from abc import ABC, abstractmethod

from app.lang import current_language, directive
from app.llm.base import LLMProvider

# Appended to every agent prompt whose output is shown to the user. Without it
# models default to clinical third person ("The user is experiencing..."),
# which reads like a note about the person rather than a reply to them.
USER_VOICE = """

Voice: every string you write is read directly by the person who asked, so
speak TO them in the second person ("you", "your") — never "the user", "the
patient", or "she". Write plainly and warmly, without jargon where a common word
works. Two exceptions:
- Questions meant for them to ask their clinician are written in THEIR voice,
  first person ("Could my low ferritin explain the tiredness?").
- Follow-up questions we are asking them stay second person ("How long has
  this been going on?").
"""


# Agents whose text the person reads. Their prompts get the language + tone directive. Intake, retrieval and
# document extraction stay untouched: they return machine-readable JSON.
LOCALIZED_AGENTS = {"chat_reply", "symptom_analysis", "womens_health", "risk_assessment", "care_planner"}


class _LocalizedLLM:
    """Wraps the provider so user-facing agents answer in the person's language without touching each prompt."""

    def __init__(self, inner: LLMProvider):
        self._inner = inner

    async def generate(self, *, system: str, prompt: str, agent: str) -> str:
        if agent in LOCALIZED_AGENTS:
            system = system + directive(current_language.get())
        return await self._inner.generate(system=system, prompt=prompt, agent=agent)

    def __getattr__(self, name):
        return getattr(self._inner, name)


class Agent(ABC):
    """One agent, one module, one responsibility, one structured JSON contract.

    `name` is the machine key used in SSE events and the pipeline context dict.
    `label` is the human-readable step description shown in the UI (e.g.
    "Analyzing symptoms").
    """

    name: str
    label: str

    def __init__(self, llm: LLMProvider):
        self.llm = _LocalizedLLM(llm)

    @abstractmethod
    async def run(self, ctx: dict) -> dict:
        """Read whatever it needs from `ctx` and return this agent's structured output.

        `ctx` accumulates prior agents' outputs under their `name` key
        (ctx["intake"], ctx["symptom_analysis"], ...) plus "message" and
        "health_profile", so later agents can build on earlier ones.
        """
