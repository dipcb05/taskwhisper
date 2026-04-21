import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Any

from ..core.cache import cache
from ..core.config import get_settings
from ..core import db as db_module
from ..models.cache_entry import CachedResult
from ..models.job import Job, JobStatus
from ..prompts.prompt_registry import PromptRegistry
from ..schemas.job import PipelineOptions
from ..services.audio_cleanup import get_cleanup_adapters
from ..services.blob_storage import BlobStorageService
from ..services.stt import get_stt_adapters
from ..services.text_cleaning import TextCleaningService
from ..services.task_extraction import TaskExtractionService
from ..services.export_connectors.connectors import get_connectors
from ..utils.errors import ServiceError
from ..utils.events import JobEventManager

logger = logging.getLogger("pipeline")


class PipelineService:
    def __init__(self, registry: PromptRegistry, events: JobEventManager):
        self.registry = registry
        self.events = events
        self.settings = get_settings()
        self.cleanup_adapters = get_cleanup_adapters()
        self.stt_adapters = get_stt_adapters()
        self.blob_storage = BlobStorageService()
        self.text_service = TextCleaningService(registry)
        self.extraction_service = TaskExtractionService(registry)
        self.connectors = get_connectors()

    async def _emit(self, job_id: str, stage: str, status: str, output: dict[str, Any] | None = None, error: dict[str, Any] | None = None, elapsed: int | None = None) -> None:
        event = {"stage": stage, "status": status, "output": output, "error": error, "elapsed_ms": elapsed}
        await self.events.emit(job_id, event)
        await db_module.get_db()[Job.collection].update_one(
            {"_id": job_id},
            {"$push": {"events": event}, "$set": {"updated_at": datetime.utcnow()}},
        )

    async def _run_stage(self, coro, job_id: str, stage: str):
        start = time.perf_counter()
        try:
            output = await coro
            elapsed = int((time.perf_counter() - start) * 1000)
            await self._emit(job_id, stage, "completed", output=output, elapsed=elapsed)
            return output
        except ServiceError as err:
            elapsed = int((time.perf_counter() - start) * 1000)
            await self._emit(job_id, stage, "failed", error={"stage": err.stage, "message": err.message, "code": err.code, "provider_response": err.provider_response}, elapsed=elapsed)
            raise

    async def run_job(self, job_id: str, user_id: str, file_path: str, options: PipelineOptions, audio_hash: str) -> None:
        db = db_module.get_db()
        config_hash = self._hash_config(options)
        local_input_path: str | None = None
        try:
            cached = await CachedResult.get(db, hash_value=audio_hash, config_hash=config_hash)
            if cached:
                await Job.save_result(db, job_id, cached["result"])
                await self._emit(job_id, "cache", "completed", output={"cached": True})
                return

            await Job.update_status(db, job_id, JobStatus.PROCESSING)
            local_input_path = await self._localize_audio(file_path)
            cleanup_adapter = self.cleanup_adapters.get(options.cleaning_engine)
            if not cleanup_adapter:
                raise ServiceError("voice_cleanup", "Unknown cleaning engine", code="unknown_engine")
            cleanup_result = await self._run_stage(
                cleanup_adapter.run(local_input_path, options.provider_options.get("cleanup", {})),
                job_id,
                "voice_cleanup",
            )

            stt_adapter = self.stt_adapters.get(options.stt_engine)
            if not stt_adapter:
                raise ServiceError("stt", "Unknown STT engine", code="unknown_engine")
            stt_options = options.provider_options.get("stt", {})
            stt_result = await self._run_stage(stt_adapter.transcribe(cleanup_result["enhanced_path"], stt_options), job_id, "stt")

            cleaned = await self._run_stage(self.text_service.clean(stt_result["text"], options.text_prompt_id, options.provider_options.get("llm", {})), job_id, "text_cleaning")

            translated = None
            if options.target_language:
                translated = await self._run_stage(
                    self.text_service.translate(cleaned["cleaned_text"], options.translation_prompt_id or "translation_base", options.target_language, options.provider_options.get("llm", {})),
                    job_id,
                    "translation",
                )

            extraction_options = options.provider_options.get("llm", {})
            tasks = await self._run_stage(
                self.extraction_service.extract(translated["translated_text"] if translated else cleaned["cleaned_text"], options.extraction_prompt_id, extraction_options),
                job_id,
                "task_extraction",
            )

            result_payload = {
                "audio_url": file_path,
                "cleaned_transcript": cleaned["cleaned_text"],
                "translated_transcript": translated["translated_text"] if translated else None,
                "tasks": tasks["tasks"],
                "summary": tasks.get("summary"),
            }

            export_outputs: dict[str, Any] = {}
            for target in options.export_targets:
                connector = self.connectors.get(target)
                if not connector:
                    export_outputs[target] = {"error": "Unknown connector"}
                    continue
                payload = await connector.prepare_payload(
                    [
                        {
                            "id": job_id,
                            "title": f"Recording {job_id}",
                            "audio_url": result_payload.get("audio_url"),
                            "cleaned_text": result_payload.get("cleaned_transcript"),
                            "raw_transcription": result_payload.get("cleaned_transcript"),
                            "tasks": result_payload["tasks"],
                        }
                    ]
                )
                integration_settings = await db["integrations"].find_one({"user_id": user_id, "provider": target}) or {}
                export_outputs[target] = await connector.send(payload, integration_settings.get("config", {}))
            if export_outputs:
                await self._emit(job_id, "export", "completed", output=export_outputs)

            result_payload["exports"] = export_outputs
            await CachedResult.save(db, audio_hash, config_hash, result_payload)
            await Job.save_result(db, job_id, result_payload)
        except ServiceError as err:
            await Job.update_status(db, job_id, JobStatus.FAILED)
            logger.exception("Pipeline failed: %s", err)
        except Exception as exc:
            await self._emit(job_id, "pipeline", "failed", error={"message": str(exc)})
            await Job.update_status(db, job_id, JobStatus.FAILED)
            logger.exception("Unexpected pipeline error")
        finally:
            self._cleanup_file(local_input_path)
            cleanup_path = None
            if "cleanup_result" in locals():
                cleanup_path = cleanup_result.get("enhanced_path")
            if cleanup_path and cleanup_path != local_input_path:
                self._cleanup_file(cleanup_path)

    def _hash_config(self, options: PipelineOptions) -> str:
        config_data = options.model_dump()
        config_data.pop("audio_hash", None)
        payload = json.dumps(config_data, sort_keys=True)
        import hashlib

        return hashlib.sha256(payload.encode()).hexdigest()

    async def save_upload(self, data: bytes, filename: str, job_id: str) -> str:
        if self.blob_storage.is_configured():
            uploaded = await self.blob_storage.upload_audio(data, filename, job_id)
            return uploaded.get("download_url") or uploaded["url"]

        os.makedirs(self.settings.effective_file_storage_path, exist_ok=True)
        file_path = os.path.join(self.settings.effective_file_storage_path, f"{job_id}-{filename}")
        await asyncio.to_thread(self._write_file, file_path, data)
        return file_path

    async def _localize_audio(self, file_path: str) -> str:
        if file_path.startswith("http://") or file_path.startswith("https://"):
            suffix = os.path.splitext(file_path.split("?")[0])[1]
            return await self.blob_storage.download_to_tempfile(file_path, suffix=suffix)
        return file_path

    @staticmethod
    def _write_file(path: str, content: bytes) -> None:
        with open(path, "wb") as f:
            f.write(content)

    @staticmethod
    def _cleanup_file(path: str | None) -> None:
        if not path:
            return
        if path.startswith("http://") or path.startswith("https://"):
            return
        try:
            if os.path.exists(path):
                os.remove(path)
        except OSError:
            logger.warning("Failed to remove temporary file %s", path)
