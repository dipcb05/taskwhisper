import asyncio
import logging
from typing import Any, Dict

from ..utils.errors import ServiceError

logger = logging.getLogger("stt")


class BaseSTTAdapter:
    name: str

    async def transcribe(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class OpenAIWhisper(BaseSTTAdapter):
    name = "openai_whisper"

    async def transcribe(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(0.1)
        if not options.get("api_key"):
            raise ServiceError(stage="stt", message="Missing OpenAI API key", code="missing_api_key")
        return {"engine": self.name, "text": "Transcribed text placeholder", "language": options.get("language", "en")}


class DeepgramSTT(BaseSTTAdapter):
    name = "deepgram"

    async def transcribe(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(0.05)
        return {"engine": self.name, "text": "Deepgram mock transcript", "language": options.get("language", "en")}


class GoogleSpeechSTT(BaseSTTAdapter):
    name = "google_speech"

    async def transcribe(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(0.05)
        return {"engine": self.name, "text": "Google speech placeholder", "language": options.get("language", "en")}


def get_stt_adapters() -> Dict[str, BaseSTTAdapter]:
    return {
        OpenAIWhisper.name: OpenAIWhisper(),
        DeepgramSTT.name: DeepgramSTT(),
        GoogleSpeechSTT.name: GoogleSpeechSTT(),
    }
