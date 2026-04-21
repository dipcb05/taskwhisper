from datetime import datetime
from typing import Any

from ..core.db import Database


class User:
    def __init__(self, uid: str, email: str | None = None, name: str | None = None, role: str = "user"):
        self.uid = uid
        self.email = email
        self.name = name
        self.role = role
        self.created_at = datetime.utcnow()

    @classmethod
    async def get_or_create(cls, db: Database, payload: dict[str, Any]) -> "User":
        uid = payload.get("uid") or payload.get("user_id") or payload.get("sub")
        email = payload.get("email")
        name = payload.get("name") or payload.get("displayName")
        role = payload.get("role", "user")
        doc = await db["users"].find_one({"uid": uid})
        if not doc:
            user = cls(uid=uid, email=email, name=name, role=role)
            await db["users"].insert_one(
                {"uid": uid, "email": email, "name": name, "role": role, "created_at": user.created_at}
            )
            return user
        return cls(uid=doc["uid"], email=doc.get("email"), name=doc.get("name"), role=doc.get("role", "user"))
