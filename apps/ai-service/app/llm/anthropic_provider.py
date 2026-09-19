"""Anthropic Claude implementation of the LLMProvider interface.

Only this file knows about the Anthropic SDK — nothing in app/agents/ or
app/orchestrator.py changes when this becomes the active provider.

Embeddings are the one method Claude cannot serve (Anthropic has no
embeddings API), so `embed()` delegates to the local ONNX embedder in
app/llm/embeddings.py. That split is deliberate: reasoning is worth paying a
frontier model for, vectorizing every query is not.
"""

from __future__ import annotations

import base64
import logging
from typing import AsyncIterator

from anthropic import AsyncAnthropic

from app.config import settings
from app.llm import embeddings
from app.llm.base import LLMProvider

logger = logging.getLogger("herai.llm.anthropic")

# Agents return small, fixed-shape JSON objects — a few hundred tokens each.
# Capped low so a runaway generation fails fast and cheap instead of burning
# a full context window per pipeline stage.
DEFAULT_MAX_TOKENS = 1500

# Every agent's system prompt demands "ONLY a JSON object, no markdown fences".
# Prefilling the assistant turn with an opening brace makes Claude continue the
# object rather than preface it with prose, so safe_json_loads() has a clean
# payload to parse instead of having to dig one out of a sentence.
_JSON_PREFILL = "{"


class AnthropicProvider(LLMProvider):
    embedding_space = embeddings.EMBEDDING_SPACE

    def __init__(self) -> None:
        self._model = settings.llm_model
        self._client_instance: AsyncAnthropic | None = None

    @property
    def _client(self) -> AsyncAnthropic:
        """Built on first use, not at construction.

        embed() is served locally and needs no credentials, so knowledge-base
        ingestion and retrieval must work without an API key being present.
        Only the chat/vision calls below require one.
        """
        if self._client_instance is None:
            if not settings.llm_api_key:
                raise ValueError(
                    "LLM_API_KEY is required for Claude calls when LLM_PROVIDER=anthropic and DEMO_MODE=false"
                )
            self._client_instance = AsyncAnthropic(api_key=settings.llm_api_key)
        return self._client_instance

    async def generate(self, *, system: str, prompt: str, agent: str) -> str:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=DEFAULT_MAX_TOKENS,
            system=system,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": _JSON_PREFILL},
            ],
        )
        text = "".join(block.text for block in response.content if block.type == "text")
        logger.info(
            "agent=%s input_tokens=%s output_tokens=%s stop=%s",
            agent,
            response.usage.input_tokens,
            response.usage.output_tokens,
            response.stop_reason,
        )
        # The prefill is part of the intended output but is not echoed back by
        # the API, so put it back to hand callers a complete JSON object.
        return _JSON_PREFILL + text

    async def generate_stream(self, *, system: str, prompt: str, agent: str) -> AsyncIterator[str]:
        yield _JSON_PREFILL
        async with self._client.messages.stream(
            model=self._model,
            max_tokens=DEFAULT_MAX_TOKENS,
            system=system,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": _JSON_PREFILL},
            ],
        ) as stream:
            async for chunk in stream.text_stream:
                yield chunk

    async def analyze_image(self, *, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=DEFAULT_MAX_TOKENS,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        return "".join(block.text for block in response.content if block.type == "text")

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return await embeddings.embed_texts(texts)
