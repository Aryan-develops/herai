import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.llm import embeddings
from app.llm.factory import get_llm_provider
from app.routes.chat import router as chat_router
from app.routes.documents import router as documents_router

# Every pipeline stage (app/orchestrator.py) and every mock-provider prompt
# (app/llm/mock_provider.py) logs through the "herai.*" logger tree, tagged
# with a per-request id — this is what lets you find exactly where a stalled
# request stopped, or see the actual prompt+context a mock handler received.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("herai").setLevel(logging.DEBUG if settings.demo_mode else logging.INFO)

logger = logging.getLogger("herai.main")


async def _warm_embedding_model() -> None:
    try:
        await embeddings.embed_texts(["warmup"])
        logger.info("embedding model warm")
    except Exception:
        # Not fatal: the first real query will retry the load itself.
        logger.exception("embedding model warmup failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Loading the local embedding model takes ~15s cold. Left lazy, the first
    # user after every restart waits that long inside Knowledge Retrieval.
    # Warm it in the background instead, so startup itself is not blocked.
    # Skipped under the mock provider, which never uses this model.
    warmup = None
    if get_llm_provider().embedding_space == embeddings.EMBEDDING_SPACE:
        warmup = asyncio.create_task(_warm_embedding_model())
    yield
    if warmup and not warmup.done():
        warmup.cancel()


app = FastAPI(title="HERAI AI Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(documents_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "demo_mode": settings.demo_mode,
        "llm_provider": settings.llm_provider,
    }
