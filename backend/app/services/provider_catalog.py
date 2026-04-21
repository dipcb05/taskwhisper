import re
from typing import Any

import httpx


OPENAI_MODELS_URL = "https://api.openai.com/v1/models"
GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models"
XAI_MODELS_URL = "https://api.x.ai/v1/models"
ANTHROPIC_MODELS_URL = "https://api.anthropic.com/v1/models"
GOOGLE_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class ProviderCatalogService:
    def __init__(self) -> None:
        self._catalog: dict[str, dict[str, list[str]]] = {
            "openai": {
                "llm": ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5", "gpt-4.1"],
                "stt": ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"],
            },
            "anthropic": {
                "llm": ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
            },
            "google": {
                "llm": ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
                "stt": ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
            },
            "gemini": {
                "llm": ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
                "stt": ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
            },
            "groq": {
                "llm": [
                    "openai/gpt-oss-120b",
                    "openai/gpt-oss-20b",
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                    "meta-llama/llama-4-scout-17b-16e-instruct",
                ],
                "stt": ["whisper-large-v3-turbo", "whisper-large-v3"],
            },
            "xai": {
                "llm": [
                    "grok-4.20-reasoning",
                    "grok-4.20-non-reasoning",
                    "grok-4-1-fast-reasoning",
                    "grok-4-1-fast-non-reasoning",
                ],
            },
        }

    async def list_models(self, provider: str, api_key: str | None = None, kind: str = "llm") -> dict[str, Any]:
        normalized = provider.lower().strip()
        normalized_kind = kind.lower().strip()
        models = await self._fetch_models(normalized, api_key, normalized_kind)
        return {
            "provider": normalized,
            "kind": normalized_kind,
            "models": models,
            "api_key_configured": bool(api_key),
        }

    async def _fetch_models(self, provider: str, api_key: str | None, kind: str) -> list[str]:
        if api_key:
            try:
                if provider == "openai":
                    models = await self._list_openai_models(api_key, kind)
                    if models:
                        return models
                if provider == "groq":
                    models = await self._list_openai_models(api_key, kind, base_url=GROQ_MODELS_URL)
                    if models:
                        return models
                if provider == "xai":
                    models = await self._list_openai_models(api_key, kind, base_url=XAI_MODELS_URL)
                    if models:
                        return models
                if provider == "anthropic":
                    models = await self._list_anthropic_models(api_key)
                    models = self._filter_models(models, kind, provider="anthropic")
                    if models:
                        return models
                if provider in {"google", "gemini"}:
                    models = await self._list_google_models(api_key, kind)
                    if models:
                        return models
            except Exception:
                pass
        fallback = self._catalog.get(provider, self._catalog["openai"])
        return fallback.get(kind) or fallback.get("llm") or self._catalog["openai"]["llm"]

    async def _list_openai_models(self, api_key: str, kind: str, base_url: str = OPENAI_MODELS_URL) -> list[str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                base_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            )
        response.raise_for_status()
        payload = response.json()
        models = [item["id"] for item in payload.get("data", []) if isinstance(item.get("id"), str)]
        return self._filter_models(models, kind, provider=self._provider_from_base_url(base_url))

    async def _list_anthropic_models(self, api_key: str) -> list[str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                ANTHROPIC_MODELS_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
            )
        response.raise_for_status()
        payload = response.json()
        return [item["id"] for item in payload.get("data", []) if isinstance(item.get("id"), str)]

    async def _list_google_models(self, api_key: str, kind: str) -> list[str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                GOOGLE_MODELS_URL,
                params={"key": api_key},
            )
        response.raise_for_status()
        payload = response.json()
        models = []
        for item in payload.get("models", []):
            name = item.get("name", "")
            if not isinstance(name, str) or not name.startswith("models/"):
                continue
            supported = item.get("supportedGenerationMethods", [])
            if "generateContent" not in supported:
                continue
            model_id = name.split("/", 1)[1]
            models.append(model_id)
        filtered = self._filter_models(models, kind, provider="google")
        if filtered:
            return filtered
        return models

    @staticmethod
    def _provider_from_base_url(base_url: str) -> str:
        lowered = base_url.lower()
        if "groq.com" in lowered:
            return "groq"
        if "x.ai" in lowered:
            return "xai"
        return "openai"

    @classmethod
    def _filter_models(cls, models: list[str], kind: str, provider: str = "openai") -> list[str]:
        unique_models: list[str] = []
        seen: set[str] = set()
        for model in models:
            if model in seen:
                continue
            lowered = model.lower().strip()
            if not cls._is_relevant_model(lowered, kind, provider):
                continue
            unique_models.append(model)
            seen.add(model)
        return cls._sort_models(unique_models, kind, provider)

    @staticmethod
    def _is_relevant_model(model: str, kind: str, provider: str) -> bool:
        if kind == "stt":
            if provider in {"openai", "groq"}:
                return "whisper" in model or "transcribe" in model
            if provider in {"google", "gemini"}:
                return model.startswith("gemini")
            return False

        blocked_tokens = (
            "audio",
            "transcribe",
            "transcription",
            "tts",
            "speech",
            "realtime",
            "moderation",
            "embedding",
            "search",
            "image",
            "vision",
            "omni-moderation",
            "computer-use",
            "codex",
        )
        if any(token in model for token in blocked_tokens):
            return False
        if re.search(r"-20\d{2}-\d{2}-\d{2}$", model):
            return False

        if provider == "openai":
            return model.startswith("gpt-") or model.startswith("o")
        if provider == "anthropic":
            return model.startswith("claude")
        if provider in {"google", "gemini"}:
            return model.startswith("gemini")
        if provider == "xai":
            return model.startswith("grok")
        if provider == "groq":
            allowed_prefixes = (
                "llama",
                "meta-llama/",
                "qwen",
                "deepseek",
                "moonshotai/",
                "openai/gpt-oss",
                "kimi",
                "compound",
            )
            return model.startswith(allowed_prefixes)
        return True

    @staticmethod
    def _sort_models(models: list[str], kind: str, provider: str) -> list[str]:
        preferred: dict[tuple[str, str], list[str]] = {
            ("openai", "llm"): ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5", "gpt-4.1", "gpt-4o", "o3", "o4-mini", "o1"],
            ("openai", "stt"): ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"],
            ("anthropic", "llm"): ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
            ("google", "llm"): ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
            ("google", "stt"): ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
            ("gemini", "llm"): ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
            ("gemini", "stt"): ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
            ("groq", "llm"): ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.3-70b-versatile", "meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.1-8b-instant"],
            ("groq", "stt"): ["whisper-large-v3-turbo", "whisper-large-v3"],
            ("xai", "llm"): ["grok-4.20-reasoning", "grok-4.20-non-reasoning", "grok-4-1-fast-reasoning", "grok-4-1-fast-non-reasoning"],
        }

        order = preferred.get((provider, kind), [])
        rank = {model: index for index, model in enumerate(order)}

        return sorted(
            models,
            key=lambda model: (
                rank.get(model, len(rank)),
                model.lower(),
            ),
        )
