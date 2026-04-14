import logging
from typing import Annotated, Optional

import firebase_admin
from fastapi import Depends, HTTPException, Header, status
from firebase_admin import auth as firebase_auth, credentials

from .config import get_settings
from ..models.user import User
from ..utils.errors import ServiceError
from ..core import db

logger = logging.getLogger("auth")


def init_firebase() -> None:
    settings = get_settings()
    if firebase_admin._apps:
        return
    if settings.firebase_project_id:
        try:
            cred: credentials.Base | None = None
            if credentials.Certificate and settings.firebase_project_id:
                try:
                    cred = credentials.ApplicationDefault()
                except Exception:
                    cred = None
            firebase_admin.initialize_app(cred, {"projectId": settings.firebase_project_id} if settings.firebase_project_id else None)
            logger.info("Firebase initialized")
        except Exception as exc:
            if not settings.allow_insecure_auth:
                raise
            logger.warning("Firebase init failed; running in insecure mode: %s", exc)
    else:
        logger.warning("No firebase_project_id configured. Insecure auth allowed: %s", settings.allow_insecure_auth)


async def get_current_user(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> User:
    settings = get_settings()
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    token = authorization.replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_info: Optional[dict] = None
    if settings.allow_insecure_auth:
        user_info = {"uid": "dev-user", "email": "dev@example.com", "name": "Dev User", "role": "admin"}
    else:
        try:
            decoded = firebase_auth.verify_id_token(token, clock_skew_seconds=30)
            user_info = decoded
        except Exception as exc:
            logger.exception("Failed to verify firebase token: %s", exc)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token")
    if not user_info:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth payload")
    user = await User.get_or_create(db.get_db(), user_info)
    return user
