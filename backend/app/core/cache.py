import asyncio
import json
from typing import Any

import redis.asyncio as redis

from .config import get_settings


class InMemoryCache:
    def __init__(self) -> None:
        self._data: dict[str, tuple[Any, float]] = {}
        self._lock = asyncio.Lock()

    async def set(self, key: str, value: Any, ex: int | None = None) -> None:
        async with self._lock:
            ttl = asyncio.get_event_loop().time() + ex if ex else None
            self._data[key] = (value, ttl or 0)

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            item = self._data.get(key)
            if not item:
                return None
            value, ttl = item
            if ttl and ttl < asyncio.get_event_loop().time():
                self._data.pop(key, None)
                return None
            return value

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._data.pop(key, None)


class Cache:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client: redis.Redis | InMemoryCache | None = None

    async def init(self) -> None:
        if self.settings.redis_url:
            try:
                self.client = redis.from_url(self.settings.redis_url, encoding="utf-8", decode_responses=True)
                await self.client.ping()
            except Exception:
                self.client = InMemoryCache()
        else:
            self.client = InMemoryCache()

    async def set_json(self, key: str, value: Any, ex: int | None = None) -> None:
        assert self.client
        payload = json.dumps(value)
        await self.client.set(key, payload, ex=ex)

    async def get_json(self, key: str) -> Any | None:
        assert self.client
        data = await self.client.get(key)
        if data is None:
            return None
        try:
            return json.loads(data)
        except Exception:
            return None

    async def delete(self, key: str) -> None:
        assert self.client
        await self.client.delete(key)


cache = Cache()
