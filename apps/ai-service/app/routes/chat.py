from __future__ import annotations

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.orchestrator import run_pipeline
from app.schemas import ChatRequest

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def chat_stream(payload: ChatRequest):
    """SSE stream of the agent pipeline's step-by-step progress and final result.

    Each emitted line is `data: <json>\\n\\n`, where the JSON has a `type` of
    "pipeline_start", "agent_step", "emergency", "final", or "error". The
    client (apps/web) reads this with a plain `fetch` + ReadableStream — see
    apps/web/src/lib/aiChat.ts — rather than EventSource, since EventSource
    can't send a POST body.
    """

    async def event_source():
        try:
            profile = payload.healthProfile.model_dump() if payload.healthProfile else None
            history = [m.model_dump() for m in payload.history]
            async for event in run_pipeline(payload.message, profile, history, payload.language):
                yield f"data: {json.dumps(event, default=str)}\n\n"
        except Exception as exc:  # noqa: BLE001 - surface any agent failure to the client instead of a bare 500
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
