from __future__ import annotations

from datetime import datetime
from typing import Any

import httpx

from ..core.config import get_settings
from ..models.user import User
from ..schemas.cloud import CloudVoiceNotePayload


class TaskWhisperCloudService:
    def __init__(self) -> None:
        settings = get_settings()
        self.supabase_url = (settings.supabase_url or "").rstrip("/")
        self.service_role_key = settings.supabase_service_role_key or ""
        self.schema = settings.supabase_schema

    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.service_role_key)

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
            "Accept-Profile": self.schema,
            "Content-Profile": self.schema,
            "Prefer": "resolution=merge-duplicates,return=minimal",
        }

    def _url(self, table: str, on_conflict: str) -> str:
        return f"{self.supabase_url}/rest/v1/{table}?on_conflict={on_conflict}"

    async def sync_notes(self, user: User, notes: list[CloudVoiceNotePayload]) -> tuple[int, int]:
        profile_payload = {
            "firebase_uid": user.uid,
            "email": user.email,
            "display_name": user.name,
            "role": user.role,
            "updated_at": datetime.utcnow().isoformat(),
        }

        note_rows: list[dict[str, Any]] = []
        task_rows: list[dict[str, Any]] = []

        for note in notes:
            note_rows.append(
                {
                    "firebase_uid": user.uid,
                    "note_id": note.id,
                    "title": note.title,
                    "created_at": note.created_at.isoformat(),
                    "duration_seconds": note.duration_seconds,
                    "audio_url": note.audio_url,
                    "raw_transcription": note.raw_transcription,
                    "cleaned_text": note.cleaned_text,
                    "status": note.status,
                    "sync_state": "synced",
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            for task in note.tasks:
                task_rows.append(
                    {
                        "firebase_uid": user.uid,
                        "task_id": task.id,
                        "note_id": note.id,
                        "content": task.text,
                        "completed": task.completed,
                        "priority": task.priority,
                        "due_date": task.due_date,
                        "sync_state": "synced",
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                )

        async with httpx.AsyncClient(timeout=20.0) as client:
            profile_res = await client.post(
                self._url("taskwhisper_profiles", "firebase_uid"),
                headers=self._headers(),
                json=[profile_payload],
            )
            profile_res.raise_for_status()

            if note_rows:
                notes_res = await client.post(
                    self._url("taskwhisper_voice_notes", "firebase_uid,note_id"),
                    headers=self._headers(),
                    json=note_rows,
                )
                notes_res.raise_for_status()

            if task_rows:
                tasks_res = await client.post(
                    self._url("taskwhisper_tasks", "firebase_uid,task_id"),
                    headers=self._headers(),
                    json=task_rows,
                )
                tasks_res.raise_for_status()

        return len(note_rows), len(task_rows)
