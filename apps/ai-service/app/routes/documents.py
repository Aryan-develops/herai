from __future__ import annotations

import json

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from app.orchestrator import run_document_pipeline

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_MIME_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_FILE_BYTES = 10 * 1024 * 1024


@router.post("/analyze")
async def analyze_document(file: UploadFile = File(...), healthProfile: str | None = Form(None)):
    """SSE stream of the document pipeline's step-by-step progress and final
    result — same event shape as /chat/stream (see app/routes/chat.py), just
    entering the orchestrator at the Document Intelligence Agent.
    """

    async def event_source():
        try:
            content = await file.read()
            if len(content) > MAX_FILE_BYTES:
                yield f"data: {json.dumps({'type': 'error', 'message': 'File is too large (max 10MB).'})}\n\n"
                return

            mime_type = file.content_type or "application/octet-stream"
            if mime_type not in ALLOWED_MIME_TYPES:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Unsupported file type: {mime_type}. Upload a PDF, JPG, or PNG.'})}\n\n"
                return

            profile = json.loads(healthProfile) if healthProfile else None
            async for event in run_document_pipeline(content, mime_type, file.filename or "report", profile):
                yield f"data: {json.dumps(event, default=str)}\n\n"
        except Exception as exc:  # noqa: BLE001 - surface any pipeline failure to the client instead of a bare 500
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
