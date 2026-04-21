from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


SyncState = Literal["local", "syncing", "synced", "error"]


class CloudTaskPayload(BaseModel):
    id: str
    text: str
    completed: bool
    priority: Literal["high", "medium", "low"] | None = None
    due_date: str | None = None
    sync_state: SyncState | None = None


class CloudVoiceNotePayload(BaseModel):
    id: str
    title: str
    created_at: datetime
    duration_seconds: int
    audio_url: str | None = None
    raw_transcription: str
    cleaned_text: str
    status: Literal["processing", "complete", "error"]
    sync_state: SyncState | None = None
    tasks: list[CloudTaskPayload] = Field(default_factory=list)


class CloudSyncRequest(BaseModel):
    notes: list[CloudVoiceNotePayload] = Field(default_factory=list)


class CloudSyncResponse(BaseModel):
    synced_notes: int
    synced_tasks: int
    synced_at: datetime
