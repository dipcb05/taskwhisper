from datetime import datetime
import hashlib
from typing import Any

from ..core.cache import cache
from ..core.config import get_settings


class CachedResult:
    @staticmethod
    def _key(hash_value: str, config_hash: str) -> str:
        digest = hashlib.sha256(f"{hash_value}:{config_hash}".encode()).hexdigest()
        return f"pipeline-result:{digest}"

    @classmethod
    async def get(cls, db: Any, hash_value: str, config_hash: str) -> dict[str, Any] | None:
        return await cache.get_json(cls._key(hash_value, config_hash))

    @classmethod
    async def save(cls, db: Any, hash_value: str, config_hash: str, result: dict[str, Any]) -> None:
        payload = {
            "hash": hash_value,
            "config_hash": config_hash,
            "result": result,
            "updated_at": datetime.utcnow().isoformat(),
        }
        await cache.set_json(
            cls._key(hash_value, config_hash),
            payload,
            ex=get_settings().cache_ttl_seconds,
        )
