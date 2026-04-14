import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import UploadFile

from ..core.cache import cache
from ..core.config import get_settings
from ..core import db as db_module
from ..models.cache_entry import CachedResult
from ..models.job import Job, JobStatus
from ..prompts.prompt_registry import PromptRegistry
from ..schemas.job import PipelineOptions
from ..services.audio_cleanup import get_cleanup_adapters
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
        self.text_service = TextCleaningService(registry)
        self.extraction_service = TaskExtractionService(registry)
        self.connectors = get_connectors()

    async def _emit(self, job_id: str, stage: str, status: str, output: dict[str, Any] | None = None, error: dict[str, Any] | None = None, elapsed: int | None = None) -> None:
        event = {"stage": stage, "status": status, "output": output, "error": error, "elapsed_ms": elapsed}
        await self.events.emit(job_id, event)
        await db_module.get_db()[Job.collection].update_one(
            {"_id": ObjectId(job_id)},
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
        try:
            cached = await CachedResult.get(db, hash_value=audio_hash, config_hash=config_hash)
            if cached:
                await Job.save_result(db, ObjectId(job_id), cached["result"])
                await self._emit(job_id, "cache", "completed", output={"cached": True})
                return

            await Job.update_status(db, ObjectId(job_id), JobStatus.PROCESSING)
            cleanup_adapter = self.cleanup_adapters.get(options.cleaning_engine)
            if not cleanup_adapter:
                raise ServiceError("voice_cleanup", "Unknown cleaning engine", code="unknown_engine")
            cleanup_result = await self._run_stage(cleanup_adapter.run(file_path, options.provider_options.get("cleanup", {})), job_id, "voice_cleanup")

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
                payload = await connector.prepare_payload(result_payload["tasks"])
                integration_settings = await db["integrations"].find_one({"user_id": user_id, "provider": target}) or {}
                export_outputs[target] = await connector.send(payload, integration_settings.get("config", {}))
            if export_outputs:
                await self._emit(job_id, "export", "completed", output=export_outputs)

            result_payload["exports"] = export_outputs
            await CachedResult.save(db, audio_hash, config_hash, result_payload)
            await Job.save_result(db, ObjectId(job_id), result_payload)
        except ServiceError as err:
            await Job.update_status(db, ObjectId(job_id), JobStatus.FAILED)
            logger.exception("Pipeline failed: %s", err)
        except Exception as exc:
            await self._emit(job_id, "pipeline", "failed", error={"message": str(exc)})
            await Job.update_status(db, ObjectId(job_id), JobStatus.FAILED)
            logger.exception("Unexpected pipeline error")

    def _hash_config(self, options: PipelineOptions) -> str:
        config_data = options.model_dump()
        config_data.pop("audio_hash", None)
        payload = json.dumps(config_data, sort_keys=True)
        import hashlib

        return hashlib.sha256(payload.encode()).hexdigest()

    async def save_upload(self, data: bytes, filename: str, job_id: str) -> str:
        os.makedirs(self.settings.file_storage_path, exist_ok=True)
        file_path = os.path.join(self.settings.file_storage_path, f"{job_id}-{filename}")
        await asyncio.to_thread(self._write_file, file_path, data)
        return file_path

    @staticmethod
    def _write_file(path: str, content: bytes) -> None:
        with open(path, "wb") as f:
            f.write(content)
