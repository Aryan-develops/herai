from __future__ import annotations

import os
import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# The AI service is called straight from browsers and phones, so a shared secret can't be kept.
# A per-address limit at least stops one client from running up the model bill.
LIMIT = int(os.getenv("AI_RATE_LIMIT_PER_MIN", "40"))
WINDOW_SECONDS = 60
PROTECTED_PREFIXES = ("/chat", "/documents", "/partner")

_hits: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or not request.url.path.startswith(PROTECTED_PREFIXES):
            return await call_next(request)

        now = time.monotonic()
        window = _hits[_client_ip(request)]
        while window and now - window[0] > WINDOW_SECONDS:
            window.popleft()
        if len(window) >= LIMIT:
            retry = max(1, int(WINDOW_SECONDS - (now - window[0])))
            return JSONResponse(
                {"detail": "Too many requests. Please wait a moment and try again."},
                status_code=429,
                headers={"Retry-After": str(retry)},
            )
        window.append(now)

        # Keep the table from growing forever on a long-running instance.
        if len(_hits) > 5000:
            for key in [k for k, v in _hits.items() if not v or now - v[-1] > WINDOW_SECONDS]:
                _hits.pop(key, None)
        return await call_next(request)
