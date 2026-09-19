"""Lightweight, file-backed vector store for the Phase 5 knowledge base.

Deliberately hidden behind one function — `retrieve()` — so the backend can
be swapped for MongoDB Atlas Vector Search (or anything else) later without
touching the agents that call it. The agents only ever see `RetrievedChunk`
objects; nothing about the storage format leaks out.

Chunks + embeddings are produced offline by scripts/ingest_knowledge.py and
written to knowledge_index.<embedding_space>.json, which this module loads
once per space and searches in memory with plain cosine similarity — entirely
adequate at this corpus size (tens of chunks), and avoids adding a real
vector-DB dependency for a demo-scale knowledge base.
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass
from pathlib import Path

from app.llm.base import LLMProvider

logger = logging.getLogger("herai.knowledge.store")

INDEX_DIR = Path(__file__).resolve().parents[2]

DEFAULT_TOP_K = 3

# Similarity thresholds are per embedding space and NOT interchangeable.
# Hashed bag-of-words scores only where vocabulary literally overlaps, so it
# sits near zero for unrelated text. A dense model puts every pair of English
# sentences in a narrow, much higher band, so the same 0.12 cutoff there would
# admit the entire corpus for every query.
#
# bge-small-en-v1.5 measured over this corpus (scripts/tune_threshold.py):
#   genuine matches   0.67 - 0.86
#   off-topic queries 0.47 - 0.54   (tyre change, cookie recipe, Eiffel Tower)
# 0.61 sits in that gap. Re-measure after editing knowledge/*.json — do not
# hand-adjust this, the two bands are far too close together to eyeball.
MIN_SIMILARITY_BY_SPACE = {
    "bow-4096": 0.12,
    "bge-small-en-v1.5": 0.61,
}
FALLBACK_MIN_SIMILARITY = 0.5

_cached_chunks: dict[str, list[dict]] = {}


def index_path(embedding_space: str) -> Path:
    return INDEX_DIR / f"knowledge_index.{embedding_space}.json"


@dataclass
class RetrievedChunk:
    title: str
    source: str
    url: str | None
    topic: str
    text: str
    similarity: float


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _load_chunks(embedding_space: str) -> list[dict]:
    if embedding_space not in _cached_chunks:
        path = index_path(embedding_space)
        if not path.exists():
            logger.warning(
                "no knowledge index for embedding space %r at %s — retrieval will return nothing. "
                "Run scripts/ingest_knowledge.py with this provider active.",
                embedding_space,
                path,
            )
            _cached_chunks[embedding_space] = []
        else:
            data = json.loads(path.read_text(encoding="utf-8"))
            _cached_chunks[embedding_space] = data.get("chunks", [])
    return _cached_chunks[embedding_space]


async def retrieve(
    query: str,
    llm: LLMProvider,
    top_k: int = DEFAULT_TOP_K,
    min_similarity: float | None = None,
) -> list[RetrievedChunk]:
    """Semantic search over the knowledge base. Returns [] — never a
    fabricated result — when the index is empty, the query is empty, or
    nothing clears the similarity threshold.

    The index and threshold are both selected by the active provider's
    `embedding_space`, so a provider swap can never search one model's index
    with another model's query vector.
    """
    space = llm.embedding_space
    if min_similarity is None:
        min_similarity = MIN_SIMILARITY_BY_SPACE.get(space, FALLBACK_MIN_SIMILARITY)

    chunks = _load_chunks(space)
    if not chunks or not query.strip():
        return []

    [query_embedding] = await llm.embed([query])

    scored: list[tuple[float, dict]] = []
    for chunk in chunks:
        similarity = _cosine(query_embedding, chunk["embedding"])
        if similarity >= min_similarity:
            scored.append((similarity, chunk))

    scored.sort(key=lambda pair: pair[0], reverse=True)

    return [
        RetrievedChunk(
            title=chunk["title"],
            source=chunk["source"],
            url=chunk.get("url"),
            topic=chunk["topic"],
            text=chunk["text"],
            similarity=round(similarity, 4),
        )
        for similarity, chunk in scored[:top_k]
    ]
