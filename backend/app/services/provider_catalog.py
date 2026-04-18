from typing import Any


class ProviderCatalogService:
    def __init__(self) -> None:
        self._catalog: dict[str, list[str]] = {
            "openai": ["gpt-4o", "gpt-4o-mini", "whisper-1"],
            "anthropic": ["claude-3-5-sonnet-latest", "claude-3-opus-latest"],
            "google": ["gemini-1.5-pro", "gemini-1.5-flash"],
            "gemini": ["gemini-1.5-pro", "gemini-1.5-flash"],
            "groq": ["whisper-large-v3", "distil-whisper-large-v3-en"],
        }

    async def list_models(self, provider: str, api_key: str | None = None) -> dict[str, Any]:
        # Keep the backend surface stable even when providers later move to live discovery.
        normalized = provider.lower().strip()
        return {
            "provider": normalized,
            "models": self._catalog.get(normalized, self._catalog["openai"]),
            "api_key_configured": bool(api_key),
        }
