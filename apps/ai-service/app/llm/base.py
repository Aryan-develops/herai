"""Provider-agnostic LLM interface.

Every agent talks to this interface, never to a specific vendor SDK. Swapping
DEMO_MODE off and pointing LLM_PROVIDER at a real vendor means writing one new
class here that implements these four methods — nothing in app/agents/ or
app/orchestrator.py needs to change.

See .env.example for how LLM_PROVIDER / LLM_API_KEY / LLM_MODEL are wired in,
and app/llm/factory.py for where a new provider gets registered.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMProvider(ABC):
    # Names the vector space this provider's embed() produces. Embeddings from
    # different models are not comparable, so app/knowledge/store.py keys both
    # the index file and the similarity threshold off this — swapping providers
    # can never silently search one model's index with another's query vector.
    embedding_space: str = "unknown"

    @abstractmethod
    async def generate(self, *, system: str, prompt: str, agent: str) -> str:
        """Return one completion for `prompt`.

        Agents send a `system` instruction plus a `prompt` describing the
        task and its structured input, and expect a JSON string back that
        matches the schema described in `system`. `agent` names the calling
        agent (e.g. "symptom_analysis") so a provider can log/route/tune per
        agent if useful.
        """

    @abstractmethod
    def generate_stream(self, *, system: str, prompt: str, agent: str) -> AsyncIterator[str]:
        """Yield incremental text chunks for `prompt` (token/chunk streaming)."""

    @abstractmethod
    async def analyze_image(self, *, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        """Vision analysis entry point — used starting Phase 4 (report/photo intelligence)."""

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one embedding vector per input text — used starting Phase 5 (RAG)."""
