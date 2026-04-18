import base64
import json
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


def _load_service_account(settings) -> dict | None:
    if settings.firebase_secret_base64:
        decoded = base64.b64decode(settings.firebase_secret_base64).decode("utf-8")
        payload = json.loads(decoded)
        if payload.get("private_key"):
            payload["private_key"] = payload["private_key"].replace("\\n", "\n")
        return payload
    if settings.firebase_client_email and settings.firebase_private_key:
        return {
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "client_email": settings.firebase_client_email,
            "private_key": settings.firebase_private_key.replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    return None


def init_firebase() -> None:
    settings = get_settings()
    if firebase_admin._apps:
        return
    service_account = _load_service_account(settings)
    project_id = settings.firebase_project_id or (service_account or {}).get("project_id")
    if project_id:
        try:
            cred: credentials.Base | None = None
            if service_account:
                cred = credentials.Certificate(service_account)
            else:
                try:
                    cred = credentials.ApplicationDefault()
                except Exception:
                    cred = None
            firebase_admin.initialize_app(cred, {"projectId": project_id})
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
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    token = authorization.replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_info: Optional[dict] = None
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
