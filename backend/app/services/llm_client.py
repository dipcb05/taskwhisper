import hashlib
import json
from typing import Any

import httpx

from ..core.cache import cache
from ..prompts.prompt_registry import PromptRegistry
from ..utils.errors import ServiceError


OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions"
ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
GOOGLE_GENERATE_CONTENT_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class LLMClient:
    def __init__(self, provider: str = "openai"):
        self.provider = provider.lower().strip()

    async def generate(self, prompt: str, options: dict[str, Any]) -> str:
        api_key = options.get("api_key")
        if not api_key:
            raise ServiceError(stage="llm", message="Missing API key", code="missing_api_key")

        if self.provider == "openai":
            return await self._generate_openai_compatible(
                endpoint=OPENAI_CHAT_COMPLETIONS_URL,
                prompt=prompt,
                options=options,
                api_key=api_key,
                error_message="LLM request failed",
            )
        if self.provider == "groq":
            return await self._generate_openai_compatible(
                endpoint=GROQ_CHAT_COMPLETIONS_URL,
                prompt=prompt,
                options=options,
                api_key=api_key,
                error_message="Groq request failed",
            )
        if self.provider == "xai":
            return await self._generate_openai_compatible(
                endpoint=XAI_CHAT_COMPLETIONS_URL,
                prompt=prompt,
                options=options,
                api_key=api_key,
                error_message="xAI request failed",
            )
        if self.provider == "anthropic":
            return await self._generate_anthropic(prompt, options, api_key)
        if self.provider in {"google", "gemini"}:
            return await self._generate_google(prompt, options, api_key)

        raise ServiceError(
            stage="llm",
            message=f"Unsupported LLM provider: {self.provider}",
            code="unsupported_provider",
        )

    async def _generate_openai_compatible(
        self,
        *,
        endpoint: str,
        prompt: str,
        options: dict[str, Any],
        api_key: str,
        error_message: str,
    ) -> str:
        response_format = None
        if options.get("response_format") == "json":
            response_format = {"type": "json_object"}

        payload = {
            "model": options.get("model") or "gpt-4o-mini",
            "temperature": options.get("temperature", 0.2),
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": self._build_user_message(options)},
            ],
        }
        if response_format:
            payload["response_format"] = response_format

        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                endpoint,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        data = self._validate_http_response(response, "llm", error_message)
        try:
            return data["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, AttributeError) as exc:
            raise ServiceError(
                stage="llm",
                message="LLM response was missing content",
                code="invalid_response",
                provider_response=data,
            ) from exc

    async def _generate_anthropic(self, prompt: str, options: dict[str, Any], api_key: str) -> str:
        payload = {
            "model": options.get("model") or "claude-3-5-sonnet-latest",
            "max_tokens": options.get("max_tokens", 2048),
            "temperature": options.get("temperature", 0.2),
            "system": prompt,
            "messages": [
                {"role": "user", "content": self._build_user_message(options)},
            ],
        }

        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                ANTHROPIC_MESSAGES_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json=payload,
            )

        data = self._validate_http_response(response, "llm", "Anthropic request failed")
        try:
            parts = data["content"]
            text_parts = [part["text"] for part in parts if part.get("type") == "text"]
            output = "\n".join(text_parts).strip()
            if not output:
                raise KeyError("empty text response")
            return output
        except (KeyError, TypeError) as exc:
            raise ServiceError(
                stage="llm",
                message="Anthropic response was missing content",
                code="invalid_response",
                provider_response=data,
            ) from exc

    async def _generate_google(self, prompt: str, options: dict[str, Any], api_key: str) -> str:
        generation_config: dict[str, Any] = {
            "temperature": options.get("temperature", 0.2),
        }
        if options.get("response_format") == "json":
            generation_config["response_mime_type"] = "application/json"

        payload = {
            "system_instruction": {
                "parts": [
                    {"text": prompt},
                ]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": self._build_user_message(options)},
                    ],
                }
            ],
            "generationConfig": generation_config,
        }

        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                GOOGLE_GENERATE_CONTENT_URL.format(model=options.get("model") or "gemini-1.5-flash"),
                headers={
                    "x-goog-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        data = self._validate_http_response(response, "llm", "Google Gemini request failed")
        try:
            parts = data["candidates"][0]["content"]["parts"]
            text_parts = [part["text"] for part in parts if "text" in part]
            output = "\n".join(text_parts).strip()
            if not output:
                raise KeyError("empty text response")
            return output
        except (KeyError, IndexError, TypeError) as exc:
            raise ServiceError(
                stage="llm",
                message="Google Gemini response was missing content",
                code="invalid_response",
                provider_response=data,
            ) from exc

    @staticmethod
    def _build_user_message(options: dict[str, Any]) -> str:
        payload = {
            key: value
            for key, value in options.items()
            if key not in {"api_key", "provider", "model", "response_format", "temperature"}
        }
        return json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True)

    @staticmethod
    def _safe_json(response: httpx.Response) -> Any:
        try:
            return response.json()
        except Exception:
            return {"text": response.text}

    @classmethod
    def _validate_http_response(cls, response: httpx.Response, stage: str, message: str) -> dict[str, Any]:
        if response.status_code >= 400:
            provider_response = cls._safe_json(response)
            raise ServiceError(
                stage=stage,
                message=message,
                code=f"http_{response.status_code}",
                provider_response=provider_response,
            )
        return response.json()


async def run_llm_prompt(prompt_id: str, registry: PromptRegistry, options: dict[str, Any]) -> str:
    prompt = await registry.load_prompt(prompt_id)
    cacheable_options = {key: value for key, value in options.items() if key != "api_key"}
    key_payload = json.dumps({"prompt_id": prompt_id, "options": cacheable_options}, sort_keys=True)
    cache_key = f"llm:{hashlib.sha256(key_payload.encode()).hexdigest()}"
    cached = None
    if cache.client:
        cached = await cache.get_json(cache_key)
    if cached:
        return cached
    client = LLMClient(provider=options.get("provider", "openai"))
    output = await client.generate(prompt, options)
    if cache.client:
        await cache.set_json(cache_key, output, ex=600)
    return output
