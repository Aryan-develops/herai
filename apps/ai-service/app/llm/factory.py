from app.config import settings
from app.llm.base import LLMProvider
from app.llm.mock_provider import MockLLMProvider


def get_llm_provider() -> LLMProvider:
    """Resolve the active LLMProvider from env (see .env.example).

    DEMO_MODE=true always wins and returns the zero-cost MockLLMProvider,
    regardless of LLM_PROVIDER — that's the whole point of demo mode. Once a
    real key is available, set DEMO_MODE=false and LLM_PROVIDER to a
    registered provider name below.

    To add a real provider: create app/llm/<name>_provider.py implementing
    LLMProvider (generate / generate_stream / analyze_image / embed) using
    LLM_API_KEY and LLM_MODEL from app.config.settings, then register it here.
    """
    if settings.demo_mode:
        return MockLLMProvider()

    provider = settings.llm_provider.lower()
    if provider == "mock":
        return MockLLMProvider()
    # Imported lazily so DEMO_MODE=true never needs a vendor SDK or the local
    # embedding model installed.
    if provider == "anthropic":
        from app.llm.anthropic_provider import AnthropicProvider

        return AnthropicProvider()
    if provider == "gemini":
        from app.llm.gemini_provider import GeminiProvider

        return GeminiProvider()
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider!r}")
