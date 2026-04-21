from datetime import datetime, timedelta
from typing import Any

from ..core.db import Database


class OAuthState:
    collection = "oauth_states"

    @classmethod
    async def create(
        cls,
        db: Database,
        *,
        state: str,
        user_id: str,
        provider: str,
        redirect_to: str,
        expires_in_minutes: int = 10,
    ) -> None:
        now = datetime.utcnow()
        await db[cls.collection].insert_one(
            {
                "state": state,
                "user_id": user_id,
                "provider": provider,
                "redirect_to": redirect_to,
                "created_at": now,
                "expires_at": now + timedelta(minutes=expires_in_minutes),
            }
        )

    @classmethod
    async def consume(cls, db: Database, state: str, provider: str) -> dict[str, Any] | None:
        doc = await db[cls.collection].find_one({"state": state, "provider": provider})
        if not doc:
            return None
        await db[cls.collection].delete_one({"_id": doc["_id"]})
        return doc
