from __future__ import annotations

import os
import tempfile
from dataclasses import asdict
from typing import Any

from vercel.blob import AsyncBlobClient

from ..core.config import get_settings


class BlobStorageService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.token = self.settings.vercel_blob_rw_token
        if self.token:
            os.environ["BLOB_READ_WRITE_TOKEN"] = self.token
        self.client = AsyncBlobClient() if self.token else None

    def is_configured(self) -> bool:
        return self.client is not None

    async def upload_audio(self, data: bytes, filename: str, job_id: str) -> dict[str, Any]:
        if not self.client:
            raise RuntimeError("Vercel Blob is not configured")

        uploaded = await self.client.put(
            f"voice-notes/{job_id}/{filename}",
            data,
            access="private",
            add_random_suffix=True,
            content_type=self._guess_content_type(filename),
        )
        payload = asdict(uploaded)
        return payload

    async def download_to_tempfile(self, blob_url: str, suffix: str | None = None) -> str:
        temp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix or "")
        try:
            temp.close()
            if self.client:
                await self.client.download_file(blob_url, temp.name, access="private", overwrite=True)
            else:
                raise RuntimeError("Vercel Blob is not configured")
        finally:
            pass
        return temp.name

    @staticmethod
    def _guess_content_type(filename: str) -> str:
        lowered = filename.lower()
        if lowered.endswith(".webm"):
            return "audio/webm"
        if lowered.endswith(".wav"):
            return "audio/wav"
        if lowered.endswith(".mp3"):
            return "audio/mpeg"
        if lowered.endswith(".m4a"):
            return "audio/mp4"
        return "application/octet-stream"
