from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from ..core.auth import get_current_user
from ..core import db
from ..core.config import get_settings
from ..models.integration import Integration
from ..models.user import User
from ..schemas.integration import (
    IntegrationCatalogItem,
    IntegrationConfig,
    IntegrationResponse,
    IntegrationSyncRequest,
    IntegrationSyncResponse,
)
from ..services.export_connectors.connectors import connector_catalog, get_connectors
from ..services.integration_oauth import IntegrationOAuthService
from ..utils.errors import ServiceError

router = APIRouter(prefix="/integrations", tags=["integrations"])
public_router = APIRouter(prefix="/integrations", tags=["integrations"])
connectors = get_connectors()
oauth_service = IntegrationOAuthService()


@router.post("", response_model=IntegrationResponse)
async def upsert_integration(payload: IntegrationConfig, user=Depends(get_current_user)) -> IntegrationResponse:
    await Integration.upsert(db.get_db(), user.uid, payload.provider, payload.config)
    return IntegrationResponse(provider=payload.provider, config=payload.config)


@router.get("", response_model=list[IntegrationResponse])
async def list_integrations(user=Depends(get_current_user)) -> list[IntegrationResponse]:
    items = await Integration.list_for_user(db.get_db(), user.uid)
    return [IntegrationResponse(provider=doc["provider"], config=doc.get("config", {})) for doc in items]


@router.get("/catalog", response_model=list[IntegrationCatalogItem])
async def list_integration_catalog(user=Depends(get_current_user)) -> list[IntegrationCatalogItem]:
    return [
        IntegrationCatalogItem.model_validate(item)
        for item in connector_catalog(oauth_service.catalog())
    ]


@router.post("/sync", response_model=IntegrationSyncResponse)
async def sync_integration(payload: IntegrationSyncRequest, user=Depends(get_current_user)) -> IntegrationSyncResponse:
    connector = connectors.get(payload.provider)
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration provider not found")

    integration = await Integration.get(db.get_db(), user.uid, payload.provider)
    config = integration.get("config", {}) if integration else {}
    prepared = await connector.prepare_payload([note.model_dump() for note in payload.notes])
    results = await connector.send(prepared, config)
    return IntegrationSyncResponse(provider=payload.provider, results=results)


@router.post("/oauth/start/{provider}")
async def start_integration_oauth(provider: str, request: Request, user: User = Depends(get_current_user)) -> dict[str, str]:
    if not oauth_service.is_supported(provider):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OAuth provider not found")

    frontend_origin = request.headers.get("origin") or request.headers.get("referer") or str(request.base_url).rstrip("/")
    authorize_url = await oauth_service.build_authorize_url(
        db.get_db(),
        provider=provider,
        user_id=user.uid,
        backend_base_url=str(request.base_url).rstrip("/"),
        frontend_origin=frontend_origin.split("/settings")[0].rstrip("/"),
    )
    return {"authorize_url": authorize_url}


@public_router.get("/oauth/callback/{provider}")
async def integration_oauth_callback(provider: str, request: Request, code: str | None = None, state: str | None = None, error: str | None = None):
    frontend_redirect = f"{get_settings().frontend_origin.rstrip('/')}/settings?oauth={provider}&status=error"
    if error:
        return RedirectResponse(url=f"{frontend_redirect}&message={quote(error, safe='')}", status_code=status.HTTP_302_FOUND)
    if not code or not state:
        return RedirectResponse(url=f"{frontend_redirect}&message=missing_code_or_state", status_code=status.HTTP_302_FOUND)

    try:
        redirect_to = await oauth_service.handle_callback(
            db.get_db(),
            provider=provider,
            code=code,
            state=state,
            backend_base_url=str(request.base_url).rstrip("/"),
        )
    except ServiceError as exc:
        target = f"{get_settings().frontend_origin.rstrip('/')}/settings?oauth={provider}&status=error&message={quote(exc.message, safe='')}"
        return RedirectResponse(url=target, status_code=status.HTTP_302_FOUND)

    return RedirectResponse(url=f"{redirect_to}?oauth={provider}&status=success", status_code=status.HTTP_302_FOUND)
