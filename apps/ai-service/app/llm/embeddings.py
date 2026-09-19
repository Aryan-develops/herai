"""Local, CPU-only sentence embeddings.

Anthropic's API does not serve embeddings, so the RAG half of the pipeline
needs its own backend. This runs BGE-small through ONNX locally, which means:

  - zero marginal cost per query (the dominant RAG cost at scale is embedding
    every user query, not the occasional re-ingest),
  - user health queries are never sent to a third party just to be vectorized,
  - nothing here changes when the chat model is swapped (Phase 6's local-LLM
    migration reuses this module untouched).

The model (~130MB) downloads once on first use and is cached on disk.
"""

from __future__ import annotations

import asyncio
import logging
import threading

logger = logging.getLogger("herai.llm.embeddings")

MODEL_NAME = "BAAI/bge-small-en-v1.5"

# Identifies the vector space these embeddings live in. Embeddings from
# different models are not comparable, so the knowledge index and the
# similarity threshold are both keyed by this — see app/knowledge/store.py.
EMBEDDING_SPACE = "bge-small-en-v1.5"

_model = None
_model_lock = threading.Lock()


def _get_model():
    """Lazily construct the model once, off the import path.

    Loading costs ~15s cold (first run also downloads the weights), which
    would otherwise be paid during FastAPI startup on every boot.
    """
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from fastembed import TextEmbedding

                logger.info("loading embedding model %s (first run downloads weights)", MODEL_NAME)
                _model = TextEmbedding(model_name=MODEL_NAME)
                logger.info("embedding model ready")
    return _model


def _embed_sync(texts: list[str]) -> list[list[float]]:
    return [vector.tolist() for vector in _get_model().embed(texts)]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed `texts`, off the event loop — ONNX inference is blocking CPU work."""
    if not texts:
        return []
    return await asyncio.to_thread(_embed_sync, texts)
