from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from ..core.auth import get_current_user
from ..schemas.cloud import CloudSyncRequest, CloudSyncResponse
from ..services.taskwhisper_cloud import TaskWhisperCloudService

router = APIRouter(prefix="/cloud", tags=["cloud"])
cloud_service = TaskWhisperCloudService()


@router.post("/sync", response_model=CloudSyncResponse)
async def sync_to_cloud(payload: CloudSyncRequest, user=Depends(get_current_user)) -> CloudSyncResponse:
    if not cloud_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TaskWhisper Cloud sync is not configured on the server.",
        )

    try:
        synced_notes, synced_tasks = await cloud_service.sync_notes(user, payload.notes)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"TaskWhisper Cloud sync failed: {exc}",
        ) from exc

    return CloudSyncResponse(
        synced_notes=synced_notes,
        synced_tasks=synced_tasks,
        synced_at=datetime.utcnow(),
    )
