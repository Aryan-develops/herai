"""Measures the similarity threshold that separates real matches from noise,
for whichever embedding space is currently active.

MIN_SIMILARITY is not transferable between embedding models: hashed
bag-of-words sits near zero for unrelated text, while a dense model scores
every pair of English sentences in a narrow, much higher band. Picking that
cutoff by intuition silently breaks retrieval in one of two ways — admitting
the whole corpus for every query, or never citing anything.

So it gets measured. ON_TOPIC queries should retrieve their expected
document; OFF_TOPIC queries should retrieve nothing at all. A usable
threshold sits between the two score distributions, and this prints both
plus the midpoint.

Run (dense space):
  DEMO_MODE=false LLM_PROVIDER=anthropic .venv/Scripts/python.exe scripts/tune_threshold.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.knowledge.store import _load_chunks, _cosine  # noqa: E402
from app.llm.factory import get_llm_provider  # noqa: E402

# (query, substring expected in the title of the top hit)
ON_TOPIC: list[tuple[str, str]] = [
    ("irregular periods and acne", "PCOS"),
    ("always tired and feeling cold", "Thyroid"),
    ("heavy periods leaving me exhausted", "Anemia"),
    ("hot flashes and night sweats in my 40s", "Perimenopause"),
    ("missed period and nausea in the morning", "Pregnancy"),
    ("can't fall asleep and wake up a lot", "Sleep"),
    ("stressed all the time and my cycle changed", "Stress"),
    ("what is a normal menstrual cycle length", "Menstrual"),
]

# Nothing in a women's-health knowledge base should answer these. Any of them
# scoring above the chosen threshold means fabricated-looking citations.
OFF_TOPIC: list[str] = [
    "how do I change a flat car tyre",
    "best programming language to learn in 2026",
    "recipe for chocolate chip cookies",
    "when was the Eiffel Tower built",
    "how to train a puppy not to bark",
]


async def top_scores(query: str, llm, chunks: list[dict]) -> list[tuple[float, str]]:
    [query_embedding] = await llm.embed([query])
    scored = [(_cosine(query_embedding, c["embedding"]), c["title"]) for c in chunks]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored[:3]


async def main() -> None:
    llm = get_llm_provider()
    space = llm.embedding_space
    chunks = _load_chunks(space)
    if not chunks:
        print(f"No index for embedding space {space!r}. Run scripts/ingest_knowledge.py first.")
        return

    print(f"Embedding space: {space}  ({len(chunks)} chunks)\n")

    print("ON-TOPIC (want: expected doc on top, high score)")
    on_topic_scores: list[float] = []
    misses = 0
    for query, expected in ON_TOPIC:
        top = await top_scores(query, llm, chunks)
        score, title = top[0]
        hit = expected.lower() in title.lower()
        misses += 0 if hit else 1
        on_topic_scores.append(score)
        print(f"  {score:.4f}  {'OK ' if hit else 'MISS'}  {query!r} -> {title}")

    print("\nOFF-TOPIC (want: below threshold, i.e. no citation at all)")
    off_topic_scores: list[float] = []
    for query in OFF_TOPIC:
        top = await top_scores(query, llm, chunks)
        score, title = top[0]
        off_topic_scores.append(score)
        print(f"  {score:.4f}  {query!r} -> {title}")

    lowest_on = min(on_topic_scores)
    highest_off = max(off_topic_scores)

    print("\n--- summary ---")
    print(f"on-topic  min={lowest_on:.4f}  max={max(on_topic_scores):.4f}")
    print(f"off-topic min={min(off_topic_scores):.4f}  max={highest_off:.4f}")
    print(f"top-hit misses: {misses}/{len(ON_TOPIC)}")

    if lowest_on > highest_off:
        suggested = round((lowest_on + highest_off) / 2, 2)
        print(f"separation: CLEAN (gap {lowest_on - highest_off:.4f})")
        print(f"suggested MIN_SIMILARITY for {space!r}: {suggested}")
    else:
        print("separation: OVERLAPPING — no single cutoff separates signal from noise.")
        print(f"  the weakest real match ({lowest_on:.4f}) scores below the best false one ({highest_off:.4f}).")
        print(f"  favouring precision (cite less, never cite junk): use {round(highest_off + 0.01, 2)}")


if __name__ == "__main__":
    asyncio.run(main())
