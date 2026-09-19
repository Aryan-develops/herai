"""Reads apps/ai-service/knowledge/*.json, chunks each document (~200-400
tokens per chunk, approximated as ~150-300 words, with a small overlap so a
concept split across a chunk boundary isn't lost), embeds every chunk via
the LLMProvider.embed() abstraction, and writes the result to
knowledge_index.json for app/knowledge/store.py to load.

Re-run this whenever knowledge/*.json changes, or after swapping in a real
LLM_PROVIDER (a different provider means different embeddings, so the whole
index should be regenerated rather than mixed).

Run: .venv/Scripts/python.exe scripts/ingest_knowledge.py
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.knowledge.store import index_path  # noqa: E402
from app.llm.factory import get_llm_provider  # noqa: E402

KNOWLEDGE_DIR = Path(__file__).resolve().parents[1] / "knowledge"

CHUNK_WORDS = 220
OVERLAP_WORDS = 40
REQUIRED_FIELDS = ("title", "source", "url", "publication_date", "topic", "content")


def chunk_text(text: str) -> list[str]:
    words = text.split()
    if len(words) <= CHUNK_WORDS:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + CHUNK_WORDS
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start = end - OVERLAP_WORDS
    return chunks


async def main() -> None:
    llm = get_llm_provider()

    doc_paths = sorted(KNOWLEDGE_DIR.glob("*.json"))
    if not doc_paths:
        print(f"No knowledge documents found in {KNOWLEDGE_DIR}")
        return
    print(f"Found {len(doc_paths)} knowledge documents in {KNOWLEDGE_DIR}")

    chunk_meta: list[dict] = []
    texts_to_embed: list[str] = []

    for path in doc_paths:
        doc = json.loads(path.read_text(encoding="utf-8"))
        missing = [f for f in REQUIRED_FIELDS if f not in doc]
        if missing:
            raise ValueError(f"{path.name} is missing required field(s): {missing}")
        if doc["source"] != "synthetic-demo" and not doc.get("url"):
            raise ValueError(f"{path.name}: non-synthetic source must include a real url")

        pieces = chunk_text(doc["content"])
        for i, piece in enumerate(pieces):
            chunk_id = hashlib.sha256(f"{path.name}:{i}".encode("utf-8")).hexdigest()[:16]
            chunk_meta.append(
                {
                    "id": chunk_id,
                    "title": doc["title"],
                    "source": doc["source"],
                    "url": doc.get("url"),
                    "publication_date": doc.get("publication_date"),
                    "topic": doc["topic"],
                    "text": piece,
                    "doc_file": path.name,
                    "chunk_index": i,
                }
            )
            texts_to_embed.append(piece)

    print(f"Chunked into {len(texts_to_embed)} chunks (~{CHUNK_WORDS} words each, {OVERLAP_WORDS}-word overlap)")
    print(f"Embedding via {type(llm).__name__} (space: {llm.embedding_space}) ...")
    embeddings = await llm.embed(texts_to_embed)

    indexed = [{**meta, "embedding": embedding} for meta, embedding in zip(chunk_meta, embeddings)]

    # One index per embedding space: switching providers writes a new file
    # rather than overwriting an index whose vectors are no longer comparable.
    out_path = index_path(llm.embedding_space)
    out_path.write_text(
        json.dumps({"embedding_space": llm.embedding_space, "chunks": indexed}), encoding="utf-8"
    )
    print(f"Wrote {len(indexed)} chunks to {out_path}")


if __name__ == "__main__":
    asyncio.run(main())
