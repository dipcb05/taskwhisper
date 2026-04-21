import logging
import base64
import os
import asyncio
from typing import Any, Dict

import httpx

from ..utils.errors import ServiceError

logger = logging.getLogger("stt")

OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions"
GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GOOGLE_GENERATE_CONTENT_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class BaseSTTAdapter:
    name: str

    async def transcribe(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class OpenAIWhisper(BaseSTTAdapter):
    name = "openai_whisper"
    _MAX_RETRIES = 2

    async def transcribe(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        provider = (options.get("provider") or "openai").lower().strip()
        if provider == "openai":
            return await self._transcribe_openai(file_path, options)
        if provider == "groq":
            return await self._transcribe_groq(file_path, options)
        if provider in {"google", "gemini"}:
            return await self._transcribe_google(file_path, options)
        raise ServiceError(stage="stt", message=f"Unsupported STT provider: {provider}", code="unsupported_provider")

    async def _transcribe_openai(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        api_key = options.get("api_key")
        if not api_key:
            raise ServiceError(stage="stt", message="Missing OpenAI API key", code="missing_api_key")

        model = options.get("model") or "whisper-1"
        language = self._normalize_language(options.get("language"))
        return await self._multipart_transcription(
            endpoint=OPENAI_TRANSCRIPTIONS_URL,
            api_key=api_key,
            auth_header=("Authorization", f"Bearer {api_key}"),
            file_path=file_path,
            model=model,
            language=language,
            engine_name=self.name,
            error_message="OpenAI transcription failed",
        )

    async def _transcribe_groq(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        api_key = options.get("api_key")
        if not api_key:
            raise ServiceError(stage="stt", message="Missing Groq API key", code="missing_api_key")

        model = options.get("model") or "whisper-large-v3"
        language = self._normalize_language(options.get("language"))
        return await self._multipart_transcription(
            endpoint=GROQ_TRANSCRIPTIONS_URL,
            api_key=api_key,
            auth_header=("Authorization", f"Bearer {api_key}"),
            file_path=file_path,
            model=model,
            language=language,
            engine_name=self.name,
            error_message="Groq transcription failed",
        )

    async def _transcribe_google(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        api_key = options.get("api_key")
        if not api_key:
            raise ServiceError(stage="stt", message="Missing Google API key", code="missing_api_key")

        model = options.get("model") or "gemini-1.5-flash"
        language = self._normalize_language(options.get("language")) or "en"
        mime_type = self._guess_mime_type(file_path)
        with open(file_path, "rb") as audio_file:
            encoded = base64.b64encode(audio_file.read()).decode("ascii")

        payload = {
            "system_instruction": {
                "parts": [
                    {
                        "text": (
                            "Transcribe the provided audio faithfully. Return only the plain text transcript "
                            f"in the original spoken language. The expected language hint is '{language}'."
                        )
                    }
                ]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": "Transcribe this audio."},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": encoded,
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0,
            },
        }

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                GOOGLE_GENERATE_CONTENT_URL.format(model=model),
                headers={
                    "x-goog-api-key": api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if response.status_code >= 400:
            raise ServiceError(
                stage="stt",
                message="Google transcription failed",
                code=f"http_{response.status_code}",
                provider_response=self._safe_json(response),
            )

        payload = response.json()
        try:
            parts = payload["candidates"][0]["content"]["parts"]
            text = "\n".join(part["text"] for part in parts if "text" in part).strip()
        except (KeyError, IndexError, TypeError) as exc:
            raise ServiceError(
                stage="stt",
                message="Google transcription response was missing text",
                code="invalid_response",
                provider_response=payload,
            ) from exc

        if not text:
            raise ServiceError(
                stage="stt",
                message="Google transcription response was empty",
                code="invalid_response",
                provider_response=payload,
            )

        return {
            "engine": self.name,
            "text": text,
            "language": language,
        }

    async def _multipart_transcription(
        self,
        *,
        endpoint: str,
        api_key: str,
        auth_header: tuple[str, str],
        file_path: str,
        model: str,
        language: str | None,
        engine_name: str,
        error_message: str,
    ) -> dict[str, Any]:
        filename = os.path.basename(file_path)
        mime_type = self._guess_mime_type(file_path)
        data = {"model": model}
        if language:
            data["language"] = language

        response = None
        for attempt in range(self._MAX_RETRIES + 1):
            with open(file_path, "rb") as audio_file:
                files = {"file": (filename, audio_file, mime_type)}
                async with httpx.AsyncClient(timeout=180.0) as client:
                    response = await client.post(
                        endpoint,
                        headers={auth_header[0]: auth_header[1]},
                        data=data,
                        files=files,
                    )

            if response.status_code != 429 or attempt >= self._MAX_RETRIES:
                break

            retry_delay = self._get_retry_delay_seconds(response, attempt)
            logger.warning(
                "STT provider rate limited request for model %s. Retrying in %.2fs (attempt %s/%s).",
                model,
                retry_delay,
                attempt + 1,
                self._MAX_RETRIES + 1,
            )
            await asyncio.sleep(retry_delay)

        assert response is not None
        if response.status_code >= 400:
            provider_response = self._safe_json(response)
            message = error_message
            if response.status_code == 429:
                detail = self._extract_provider_error_message(provider_response)
                message = f"{error_message}: rate limit exceeded"
                if detail:
                    message = f"{message}. {detail}"
            raise ServiceError(
                stage="stt",
                message=message,
                code=f"http_{response.status_code}",
                provider_response=provider_response,
            )

        payload = response.json()
        text = payload.get("text")
        if not text:
            raise ServiceError(
                stage="stt",
                message="OpenAI transcription response was missing text",
                code="invalid_response",
                provider_response=payload,
            )
        return {
            "engine": engine_name,
            "text": text,
            "language": payload.get("language") or data.get("language") or "en",
        }

    @staticmethod
    def _get_retry_delay_seconds(response: httpx.Response, attempt: int) -> float:
        retry_after = response.headers.get("retry-after")
        if retry_after:
            try:
                return max(1.0, min(float(retry_after), 30.0))
            except ValueError:
                pass
        return min(2 ** attempt, 8)

    @staticmethod
    def _extract_provider_error_message(provider_response: Any) -> str | None:
        if isinstance(provider_response, dict):
            error = provider_response.get("error")
            if isinstance(error, dict):
                message = error.get("message")
                if isinstance(message, str) and message.strip():
                    return message.strip()
            message = provider_response.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()
        return None

    @staticmethod
    def _normalize_language(language: str | None) -> str | None:
        if not language:
            return None
        return language.split("-")[0].lower()

    @staticmethod
    def _guess_mime_type(file_path: str) -> str:
        lowered = file_path.lower()
        if lowered.endswith(".webm"):
            return "audio/webm"
        if lowered.endswith(".wav"):
            return "audio/wav"
        if lowered.endswith(".mp3"):
            return "audio/mpeg"
        if lowered.endswith(".m4a"):
            return "audio/mp4"
        if lowered.endswith(".ogg"):
            return "audio/ogg"
        return "application/octet-stream"

    @staticmethod
    def _safe_json(response: httpx.Response) -> Any:
        try:
            return response.json()
        except Exception:
            return {"text": response.text}


class DeepgramSTT(BaseSTTAdapter):
    name = "deepgram"

    async def transcribe(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        raise ServiceError(stage="stt", message="Deepgram STT is not implemented", code="unsupported_provider")


class GoogleSpeechSTT(BaseSTTAdapter):
    name = "google_speech"

    async def transcribe(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        raise ServiceError(stage="stt", message="Google Speech STT is not implemented", code="unsupported_provider")


def get_stt_adapters() -> Dict[str, BaseSTTAdapter]:
    return {
        OpenAIWhisper.name: OpenAIWhisper(),
        DeepgramSTT.name: DeepgramSTT(),
        GoogleSpeechSTT.name: GoogleSpeechSTT(),
    }
