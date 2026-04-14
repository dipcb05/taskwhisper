from datetime import datetime
from typing import Any
from motor.motor_asyncio import AsyncIOMotorDatabase


class Integration:
    collection = "integrations"

    @classmethod
    async def upsert(cls, db: AsyncIOMotorDatabase, user_id: str, provider: str, config: dict[str, Any]) -> None:
        await db[cls.collection].update_one(
            {"user_id": user_id, "provider": provider},
            {"$set": {"config": config, "updated_at": datetime.utcnow()}, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True,
        )

    @classmethod
    async def list_for_user(cls, db: AsyncIOMotorDatabase, user_id: str) -> list[dict[str, Any]]:
        cursor = db[cls.collection].find({"user_id": user_id})
        return [doc async for doc in cursor]

    @classmethod
    async def get(cls, db: AsyncIOMotorDatabase, user_id: str, provider: str) -> dict[str, Any] | None:
        return await db[cls.collection].find_one({"user_id": user_id, "provider": provider})
