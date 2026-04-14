from datetime import datetime
from typing import Any
from motor.motor_asyncio import AsyncIOMotorDatabase


class CachedResult:
    collection = "cached_results"

    @classmethod
    async def get(cls, db: AsyncIOMotorDatabase, hash_value: str, config_hash: str) -> dict[str, Any] | None:
        return await db[cls.collection].find_one({"hash": hash_value, "config_hash": config_hash})

    @classmethod
    async def save(cls, db: AsyncIOMotorDatabase, hash_value: str, config_hash: str, result: dict[str, Any]) -> None:
        await db[cls.collection].update_one(
            {"hash": hash_value, "config_hash": config_hash},
            {"$set": {"result": result, "updated_at": datetime.utcnow()}, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True,
        )
