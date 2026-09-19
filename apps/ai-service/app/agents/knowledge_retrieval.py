from __future__ import annotations

from app.agents.base import Agent
from app.knowledge.store import retrieve


class KnowledgeRetrievalAgent(Agent):
    """A genuine pipeline stage, not a side lookup: semantic search over the
    knowledge base (app/knowledge/store.py), run once per query/report and
    handed to the reasoning agents (Symptom Analysis, Women's Health,
    Document Intelligence) as grounding context alongside the user's own
    data. Its output also feeds the final response's `sources[]` — populated
    only from what was actually retrieved, empty when nothing clears the
    similarity threshold.
    """

    name = "knowledge_retrieval"
    label = "Searching knowledge base"

    async def run(self, ctx: dict) -> dict:
        query = self._build_query(ctx)
        chunks = await retrieve(query, self.llm)
        return {
            "query": query,
            "chunks": [
                {
                    "title": c.title,
                    "source": c.source,
                    "url": c.url,
                    "topic": c.topic,
                    "text": c.text,
                    "similarity": c.similarity,
                }
                for c in chunks
            ],
        }

    @staticmethod
    def _build_query(ctx: dict) -> str:
        # Reuses the Intake Agent's own classification of the query — the
        # extracted symptoms/context ARE the intent signal we search with —
        # rather than running a second, separate intent-detection pass.
        intake = ctx.get("intake") or {}
        extracted = intake.get("extracted", {})
        parts = list(extracted.get("symptoms") or [])
        if extracted.get("context"):
            parts.append(extracted["context"])

        # Document pipeline: no "intake", search on the abnormal lab values instead.
        for value in ctx.get("extracted_values") or []:
            if value.get("status") not in ("in_range", "unparseable", None):
                parts.append(value["parameter"])

        return ", ".join(parts) if parts else ctx.get("message", "")
