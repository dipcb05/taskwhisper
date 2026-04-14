import asyncio
import logging
from typing import Any, Callable, Dict

from ..utils.errors import ServiceError

logger = logging.getLogger("audio_cleanup")


class BaseCleanupAdapter:
    name: str

    async def run(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class ElevenLabsIsolator(BaseCleanupAdapter):
    name = "elevenlabs"

    async def run(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(0.1)
        if not options.get("api_key"):
            raise ServiceError(stage="voice_cleanup", message="Missing ElevenLabs API key", code="missing_api_key")
        return {"engine": self.name, "enhanced_path": file_path, "notes": "Stubbed isolate run"}


class AdobeEnhance(BaseCleanupAdapter):
    name = "adobe"

    async def run(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(0.05)
        return {"engine": self.name, "enhanced_path": file_path, "notes": "Adobe Enhance placeholder"}


class LocalFFmpeg(BaseCleanupAdapter):
    name = "local-ffmpeg"

    async def run(self, file_path: str, options: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(0.05)
        return {"engine": self.name, "enhanced_path": file_path, "notes": "Local DSP mock"}


def get_cleanup_adapters() -> Dict[str, BaseCleanupAdapter]:
    return {
        ElevenLabsIsolator.name: ElevenLabsIsolator(),
        AdobeEnhance.name: AdobeEnhance(),
        LocalFFmpeg.name: LocalFFmpeg(),
    }
