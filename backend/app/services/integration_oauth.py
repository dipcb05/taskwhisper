from __future__ import annotations

import base64
import secrets
from datetime import datetime, timedelta
from typing import Any
from urllib.parse import urlencode, quote

import httpx

from ..core.config import get_settings
from ..models.integration import Integration
from ..models.oauth_state import OAuthState
from ..utils.errors import ServiceError


NOTION_AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize"
NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"
SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
TODOIST_AUTHORIZE_URL = "https://app.todoist.com/oauth/authorize"
TODOIST_TOKEN_URL = "https://todoist.com/oauth/access_token"


class IntegrationOAuthService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def catalog(self) -> dict[str, dict[str, Any]]:
        tenant = self.settings.microsoft_oauth_tenant_id or "common"
        return {
            "notion": {
                "client_id": self.settings.notion_oauth_client_id,
                "client_secret": self.settings.notion_oauth_client_secret,
                "authorize_url": NOTION_AUTHORIZE_URL,
                "scopes": [],
                "label": "Connect Notion",
            },
            "slack": {
                "client_id": self.settings.slack_oauth_client_id,
                "client_secret": self.settings.slack_oauth_client_secret,
                "authorize_url": SLACK_AUTHORIZE_URL,
                "scopes": ["chat:write"],
                "label": "Connect Slack",
            },
            "google_tasks": {
                "client_id": self.settings.google_oauth_client_id,
                "client_secret": self.settings.google_oauth_client_secret,
                "authorize_url": GOOGLE_AUTHORIZE_URL,
                "scopes": ["https://www.googleapis.com/auth/tasks"],
                "label": "Connect Google",
            },
            "google_keep": {
                "client_id": self.settings.google_oauth_client_id,
                "client_secret": self.settings.google_oauth_client_secret,
                "authorize_url": GOOGLE_AUTHORIZE_URL,
                "scopes": ["https://www.googleapis.com/auth/keep"],
                "label": "Connect Google",
            },
            "microsoft_todo": {
                "client_id": self.settings.microsoft_oauth_client_id,
                "client_secret": self.settings.microsoft_oauth_client_secret,
                "authorize_url": f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
                "scopes": ["offline_access", "Tasks.ReadWrite"],
                "label": "Connect Microsoft",
            },
            "microsoft_onenote": {
                "client_id": self.settings.microsoft_oauth_client_id,
                "client_secret": self.settings.microsoft_oauth_client_secret,
                "authorize_url": f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
                "scopes": ["offline_access", "Notes.Create"],
                "label": "Connect Microsoft",
            },
            "todoist": {
                "client_id": self.settings.todoist_oauth_client_id,
                "client_secret": self.settings.todoist_oauth_client_secret,
                "authorize_url": TODOIST_AUTHORIZE_URL,
                "scopes": ["task:add", "data:read_write"],
                "label": "Connect Todoist",
            },
        }

    def is_supported(self, provider: str) -> bool:
        return provider in self.catalog()

    def is_configured(self, provider: str) -> bool:
        item = self.catalog().get(provider)
        return bool(item and item.get("client_id") and item.get("client_secret"))

    def oauth_metadata(self, provider: str) -> dict[str, Any]:
        item = self.catalog().get(provider, {})
        return {
            "oauth_supported": provider in self.catalog(),
            "oauth_label": item.get("label"),
        }

    async def build_authorize_url(
        self,
        db,
        *,
        provider: str,
        user_id: str,
        backend_base_url: str,
        frontend_origin: str,
    ) -> str:
        config = self.catalog().get(provider)
        if not config or not self.is_configured(provider):
            raise ServiceError("integration_oauth", f"OAuth is not configured for {provider}", code="oauth_not_configured")

        state = secrets.token_urlsafe(32)
        callback_url = self._callback_url(backend_base_url, provider)
        await OAuthState.create(db, state=state, user_id=user_id, provider=provider, redirect_to=f"{frontend_origin.rstrip('/')}/settings")

        if provider == "notion":
            query = {
                "owner": "user",
                "client_id": config["client_id"],
                "redirect_uri": callback_url,
                "response_type": "code",
                "state": state,
            }
            return f"{config['authorize_url']}?{urlencode(query)}"

        if provider == "slack":
            query = {
                "client_id": config["client_id"],
                "scope": ",".join(config["scopes"]),
                "redirect_uri": callback_url,
                "state": state,
            }
            return f"{config['authorize_url']}?{urlencode(query)}"

        if provider.startswith("google_"):
            query = {
                "client_id": config["client_id"],
                "redirect_uri": callback_url,
                "response_type": "code",
                "access_type": "offline",
                "include_granted_scopes": "true",
                "prompt": "consent",
                "scope": " ".join(config["scopes"]),
                "state": state,
            }
            return f"{config['authorize_url']}?{urlencode(query)}"

        if provider.startswith("microsoft_"):
            query = {
                "client_id": config["client_id"],
                "response_type": "code",
                "redirect_uri": callback_url,
                "response_mode": "query",
                "scope": " ".join(config["scopes"]),
                "state": state,
            }
            return f"{config['authorize_url']}?{urlencode(query)}"

        if provider == "todoist":
            query = {
                "client_id": config["client_id"],
                "scope": ",".join(config["scopes"]),
                "state": state,
                "redirect_uri": callback_url,
            }
            return f"{config['authorize_url']}?{urlencode(query)}"

        raise ServiceError("integration_oauth", f"Unsupported OAuth provider: {provider}", code="unsupported_provider")

    async def handle_callback(self, db, *, provider: str, code: str, state: str, backend_base_url: str) -> str:
        state_doc = await OAuthState.consume(db, state, provider)
        if not state_doc:
            raise ServiceError("integration_oauth", "Invalid or expired OAuth state", code="invalid_state")
        if state_doc["expires_at"] < datetime.utcnow():
            raise ServiceError("integration_oauth", "Expired OAuth state", code="expired_state")

        config = self.catalog().get(provider)
        if not config:
            raise ServiceError("integration_oauth", f"Unsupported OAuth provider: {provider}", code="unsupported_provider")

        callback_url = self._callback_url(backend_base_url, provider)
        token_payload = await self._exchange_code(provider, code, callback_url, config)
        integration_config = await self._token_to_config(provider, token_payload)

        existing = await Integration.get(db, state_doc["user_id"], provider) or {}
        merged = {**existing.get("config", {}), **integration_config}
        await Integration.upsert(db, state_doc["user_id"], provider, merged)

        return state_doc["redirect_to"]

    async def _exchange_code(self, provider: str, code: str, redirect_uri: str, config: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if provider == "notion":
                basic = base64.b64encode(f"{config['client_id']}:{config['client_secret']}".encode()).decode()
                response = await client.post(
                    NOTION_TOKEN_URL,
                    headers={
                        "Authorization": f"Basic {basic}",
                        "Content-Type": "application/json",
                        "Notion-Version": "2026-03-11",
                    },
                    json={
                        "grant_type": "authorization_code",
                        "code": code,
                        "redirect_uri": redirect_uri,
                    },
                )
            elif provider == "slack":
                response = await client.post(
                    SLACK_TOKEN_URL,
                    data={
                        "code": code,
                        "client_id": config["client_id"],
                        "client_secret": config["client_secret"],
                        "redirect_uri": redirect_uri,
                    },
                )
            elif provider.startswith("google_"):
                response = await client.post(
                    GOOGLE_TOKEN_URL,
                    data={
                        "code": code,
                        "client_id": config["client_id"],
                        "client_secret": config["client_secret"],
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                )
            elif provider.startswith("microsoft_"):
                tenant = self.settings.microsoft_oauth_tenant_id or "common"
                response = await client.post(
                    f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                    data={
                        "client_id": config["client_id"],
                        "client_secret": config["client_secret"],
                        "code": code,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                    },
                )
            elif provider == "todoist":
                response = await client.post(
                    TODOIST_TOKEN_URL,
                    data={
                        "client_id": config["client_id"],
                        "client_secret": config["client_secret"],
                        "code": code,
                        "redirect_uri": redirect_uri,
                    },
                )
            else:
                raise ServiceError("integration_oauth", f"Unsupported OAuth provider: {provider}", code="unsupported_provider")

        if response.status_code >= 400:
            raise ServiceError(
                "integration_oauth",
                f"OAuth token exchange failed for {provider}",
                code=f"http_{response.status_code}",
                provider_response=self._safe_json(response),
            )

        payload = self._safe_json(response)
        if provider == "slack" and not payload.get("ok"):
            raise ServiceError(
                "integration_oauth",
                f"Slack OAuth token exchange failed: {payload.get('error')}",
                code="oauth_exchange_failed",
                provider_response=payload,
            )
        return payload

    async def _token_to_config(self, provider: str, payload: dict[str, Any]) -> dict[str, Any]:
        expires_at = None
        expires_in = payload.get("expires_in")
        if isinstance(expires_in, int):
            expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()

        if provider == "notion":
            return {
                "api_key": payload.get("access_token", ""),
                "refresh_token": payload.get("refresh_token"),
                "workspace_id": payload.get("workspace_id"),
                "workspace_name": payload.get("workspace_name"),
            }
        if provider == "slack":
            authed_user = payload.get("authed_user") if isinstance(payload.get("authed_user"), dict) else {}
            return {
                "bot_token": payload.get("access_token", ""),
                "team_id": payload.get("team", {}).get("id") if isinstance(payload.get("team"), dict) else None,
                "team_name": payload.get("team", {}).get("name") if isinstance(payload.get("team"), dict) else None,
                "user_access_token": authed_user.get("access_token"),
            }
        if provider in {"google_tasks", "google_keep", "microsoft_todo", "microsoft_onenote"}:
            return {
                "access_token": payload.get("access_token", ""),
                "refresh_token": payload.get("refresh_token"),
                "token_type": payload.get("token_type"),
                "expires_at": expires_at,
                "scope": payload.get("scope"),
            }
        if provider == "todoist":
            return {
                "api_key": payload.get("access_token", ""),
                "token_type": payload.get("token_type"),
            }
        return payload

    @staticmethod
    def _safe_json(response: httpx.Response) -> dict[str, Any]:
        try:
            payload = response.json()
            return payload if isinstance(payload, dict) else {"data": payload}
        except Exception:
            return {"text": response.text}

    @staticmethod
    def _callback_url(backend_base_url: str, provider: str) -> str:
        return f"{backend_base_url.rstrip('/')}/api/integrations/oauth/callback/{quote(provider, safe='')}"
