"""Google Gemini implementation of the LLMProvider interface.

Gemini Flash is the cost floor for this workload: it is multimodal (so lab
report photos go through the same call as text), has a usable free tier, and
is cheap enough per call that the bulk reasoning agents can run on it without
the per-user cost becoming the product's main expense.

As with the Anthropic provider, embeddings are deliberately NOT taken from
the vendor. Gemini does offer an embeddings endpoint, but embedding every
user query is the highest-volume RAG operation and the one most worth keeping
free and local — see app/llm/embeddings.py.
"""

from __future__ import annotations

import asyncio
import logging
import random
from typing import AsyncIterator

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import settings
from app.llm import embeddings
from app.llm.base import LLMProvider

logger = logging.getLogger("herai.llm.gemini")

DEFAULT_MAX_TOKENS = 1500

# The free tier returns 503 ("high demand") readily, and one pipeline run makes
# six to eight calls — so without this a single transient 503 anywhere in the
# chain fails the user's whole request.
_RETRY_STATUSES = {429, 500, 502, 503, 504}
_MAX_ATTEMPTS = 4
_BASE_DELAY_SECONDS = 1.0


async def _with_retry(operation, *, agent: str):
    """Retry transient upstream failures with exponential backoff and jitter.

    Only retries statuses that indicate a temporary upstream condition — a 400
    or 404 is a bug in the request and must surface immediately, not be retried.
    """
    last_error: Exception | None = None
    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            return await operation()
        except genai_errors.APIError as error:
            if error.code not in _RETRY_STATUSES or attempt == _MAX_ATTEMPTS:
                raise
            last_error = error
            delay = _BASE_DELAY_SECONDS * (2 ** (attempt - 1)) + random.uniform(0, 0.4)
            logger.warning(
                "agent=%s upstream %s, retrying in %.1fs (attempt %d/%d)",
                agent, error.code, delay, attempt, _MAX_ATTEMPTS,
            )
            await asyncio.sleep(delay)
    raise last_error  # unreachable, but keeps the contract explicit

# Agents ask for small, fixed-shape JSON. Gemini enforces that natively via
# response_mime_type, so unlike the Anthropic provider there is no prefill
# trick needed to stop the model wrapping its answer in prose.
_JSON_MIME = "application/json"


class GeminiProvider(LLMProvider):
    embedding_space = embeddings.EMBEDDING_SPACE

    def __init__(self) -> None:
        self._model = settings.llm_model
        self._client_instance: genai.Client | None = None

    @property
    def _client(self) -> genai.Client:
        """Built on first use, not at construction — embed() is served locally
        and needs no credentials, so ingestion and retrieval work without a key.
        """
        if self._client_instance is None:
            if not settings.llm_api_key:
                raise ValueError(
                    "LLM_API_KEY is required for Gemini calls when LLM_PROVIDER=gemini and DEMO_MODE=false"
                )
            self._client_instance = genai.Client(api_key=settings.llm_api_key)
        return self._client_instance

    def _config(self, system: str | None) -> types.GenerateContentConfig:
        return types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=DEFAULT_MAX_TOKENS,
            response_mime_type=_JSON_MIME,
        )

    async def generate(self, *, system: str, prompt: str, agent: str) -> str:
        response = await _with_retry(
            lambda: self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=self._config(system),
            ),
            agent=agent,
        )
        usage = response.usage_metadata
        logger.info(
            "agent=%s input_tokens=%s output_tokens=%s",
            agent,
            getattr(usage, "prompt_token_count", None),
            getattr(usage, "candidates_token_count", None),
        )
        return response.text or ""

    async def generate_stream(self, *, system: str, prompt: str, agent: str) -> AsyncIterator[str]:
        stream = await self._client.aio.models.generate_content_stream(
            model=self._model,
            contents=prompt,
            config=self._config(system),
        )
        async for chunk in stream:
            if chunk.text:
                yield chunk.text

    async def analyze_image(self, *, image_bytes: bytes, mime_type: str, prompt: str) -> str:
        response = await _with_retry(
            lambda: self._client.aio.models.generate_content(
                model=self._model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt,
                ],
                config=self._config(None),
            ),
            agent="analyze_image",
        )
        return response.text or ""

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return await embeddings.embed_texts(texts)
