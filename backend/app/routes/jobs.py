import asyncio
import hashlib
import logging
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi import Request, status

from ..core.auth import get_current_user
from ..core import db
from ..models.job import Job
from ..schemas.job import JobResponse, PipelineOptions
from ..utils.errors import ServiceError

router = APIRouter(prefix="/jobs", tags=["jobs"])
logger = logging.getLogger("jobs")


@router.post("", response_model=JobResponse)
async def create_job(
    request: Request,
    file: UploadFile = File(...),
    options: str = Form(...),
    user=Depends(get_current_user),
) -> JobResponse:
    try:
        parsed_options = PipelineOptions.model_validate_json(options)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid options: {exc}")
    data = await file.read()
    audio_hash = hashlib.sha256(data).hexdigest()
    job_id = await Job.create(db.get_db(), user.uid, {"options": parsed_options.model_dump(), "filename": file.filename})
    pipeline = request.app.state.pipeline  # type: ignore
    file_path = await pipeline.save_upload(data, file.filename, job_id)
    asyncio.create_task(pipeline.run_job(job_id, user.uid, file_path, parsed_options, audio_hash))
    job_doc = await db.get_db()[Job.collection].find_one({"_id": ObjectId(job_id)})
    return JobResponse(
        id=str(job_doc["_id"]),
        status=job_doc["status"],
        created_at=job_doc["created_at"],
        updated_at=job_doc["updated_at"],
        result=job_doc.get("result"),
        events=job_doc.get("events", []),
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, user=Depends(get_current_user)) -> JobResponse:
    doc = await db.get_db()[Job.collection].find_one({"_id": ObjectId(job_id), "user_id": user.uid})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobResponse(
        id=str(doc["_id"]),
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        result=doc.get("result"),
        events=doc.get("events", []),
    )


@router.get("", response_model=list[JobResponse])
async def list_jobs(user=Depends(get_current_user)) -> list[JobResponse]:
    cursor = db.get_db()[Job.collection].find({"user_id": user.uid}).sort("created_at", -1).limit(25)
    results = []
    async for doc in cursor:
        results.append(
            JobResponse(
                id=str(doc["_id"]),
                status=doc["status"],
                created_at=doc["created_at"],
                updated_at=doc["updated_at"],
                result=doc.get("result"),
                events=doc.get("events", []),
            )
        )
    return results
