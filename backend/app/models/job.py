from datetime import datetime
from typing import Any

from ..core.db import LocalDatabase


class JobStatus:
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PARTIAL = "PARTIAL_SUCCESS"
    FAILED = "FAILED"
    COMPLETED = "COMPLETED"


class Job:
    collection = "jobs"

    @classmethod
    async def create(cls, db: LocalDatabase, user_id: str, config: dict[str, Any]) -> str:
        now = datetime.utcnow()
        doc = {
            "user_id": user_id,
            "config": config,
            "status": JobStatus.PENDING,
            "created_at": now,
            "updated_at": now,
            "events": [],
            "result": None,
        }
        res = await db[cls.collection].insert_one(doc)
        return str(res.inserted_id)

    @classmethod
    async def update_status(cls, db: LocalDatabase, job_id: Any, status: str, event: dict[str, Any] | None = None) -> None:
        update: dict[str, Any] = {"status": status, "updated_at": datetime.utcnow()}
        if event:
            update["$push"] = {"events": event}
        await db[cls.collection].update_one({"_id": job_id}, {"$set": update} if not event else {"$set": {"status": status, "updated_at": datetime.utcnow()}, "$push": {"events": event}})

    @classmethod
    async def save_result(cls, db: LocalDatabase, job_id: Any, result: dict[str, Any]) -> None:
        await db[cls.collection].update_one(
            {"_id": job_id},
            {"$set": {"result": result, "status": JobStatus.COMPLETED, "updated_at": datetime.utcnow()}},
        )

    @classmethod
    async def get(cls, db: LocalDatabase, job_id: Any) -> dict[str, Any] | None:
        return await db[cls.collection].find_one({"_id": job_id})
