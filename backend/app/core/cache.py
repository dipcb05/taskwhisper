import json
import logging
from typing import Any

from redis import asyncio as redis

from .config import get_settings

logger = logging.getLogger("cache")


class Cache:
    def __init__(self) -> None:
        self.client: redis.Redis | None = None

    async def init(self) -> None:
        settings = get_settings()
        if not settings.redis_url:
            logger.warning("REDIS_URL is not configured; cache disabled")
            self.client = None
            return

        self.client = redis.from_url(settings.redis_url, decode_responses=True)
        try:
            await self.client.ping()
        except Exception:
            logger.exception("Failed to initialize Redis cache; cache disabled")
            self.client = None

    async def set_json(self, key: str, value: Any, ex: int | None = None) -> None:
        if not self.client:
            return
        payload = json.dumps(value)
        await self.client.set(key, payload, ex=ex)

    async def get_json(self, key: str) -> Any | None:
        if not self.client:
            return None
        data = await self.client.get(key)
        if data is None:
            return None
        try:
            return json.loads(data)
        except Exception:
            logger.exception("Failed to decode cached JSON for key %s", key)
            return None

    async def delete(self, key: str) -> None:
        if not self.client:
            return
        await self.client.delete(key)

    async def close(self) -> None:
        if self.client:
            await self.client.aclose()
            self.client = None


cache = Cache()
