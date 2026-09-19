import os
from pathlib import Path
from dotenv import load_dotenv

# Load the shared root .env (herai/.env), same file apps/api reads.
load_dotenv(Path(__file__).resolve().parents[3] / ".env")


class Settings:
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    # Off by default: agent prompts and results carry the user's symptoms,
    # conditions, medications and free-text query. Logging those writes health
    # data to plaintext on disk, which is a breach with real users even though
    # it is harmless against demo data. Enable ONLY against synthetic data.
    log_health_data: bool = os.getenv("LOG_HEALTH_DATA", "false").lower() == "true"
    port: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "claude-sonnet-5")
    # Comma-separated, same as apps/api — only matters for browser-based
    # clients (apps/web, `expo start --web`); native iOS/Android never hit
    # browser CORS at all.
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGIN", "http://localhost:5173,http://localhost:8081").split(",")
    ]


settings = Settings()
