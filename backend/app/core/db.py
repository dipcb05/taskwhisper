from typing import Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import get_settings

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    global client, database
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongo_uri)
    database = client[settings.mongo_db]


async def close_mongo_connection() -> None:
    if client:
        client.close()


def get_db() -> AsyncIOMotorDatabase:
    if database is None:
        raise RuntimeError("Database not initialized")
    return database


async def ensure_indexes() -> None:
    db = get_db()
    await db["jobs"].create_index("user_id")
    await db["jobs"].create_index("status")
    await db["cached_results"].create_index([("hash", 1), ("config_hash", 1)], unique=True)
    await db["integrations"].create_index("user_id")
