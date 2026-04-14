from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


class PipelineOptions(BaseModel):
    cleaning_engine: str = Field(..., examples=["elevenlabs", "adobe", "local-ffmpeg"])
    stt_engine: str = Field(..., examples=["openai_whisper", "deepgram"])
    text_prompt_id: str = Field(default="cleanup_base")
    translation_prompt_id: Optional[str] = None
    extraction_prompt_id: str = Field(default="task_extraction_notion")
    target_language: Optional[str] = None
    export_targets: list[str] = Field(default_factory=list)
    provider_options: dict[str, Any] = Field(default_factory=dict)


class JobCreate(BaseModel):
    filename: str
    options: PipelineOptions
    audio_hash: str


class JobResponse(BaseModel):
    id: str
    status: Literal["PENDING", "PROCESSING", "PARTIAL_SUCCESS", "FAILED", "COMPLETED"]
    created_at: datetime
    updated_at: datetime
    result: Optional[dict[str, Any]] = None
    events: list[dict[str, Any]] = Field(default_factory=list)


class StageResult(BaseModel):
    stage: str
    status: str
    output: Optional[dict[str, Any]] = None
    error: Optional[dict[str, Any]] = None
    elapsed_ms: Optional[int] = None
