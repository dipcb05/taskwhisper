from fastapi import APIRouter, Depends

from ..core.auth import get_current_user
from ..core import db
from ..models.integration import Integration
from ..schemas.integration import IntegrationConfig, IntegrationResponse

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.post("", response_model=IntegrationResponse)
async def upsert_integration(payload: IntegrationConfig, user=Depends(get_current_user)) -> IntegrationResponse:
    await Integration.upsert(db.get_db(), user.uid, payload.provider, payload.config)
    return IntegrationResponse(provider=payload.provider, config=payload.config)


@router.get("", response_model=list[IntegrationResponse])
async def list_integrations(user=Depends(get_current_user)) -> list[IntegrationResponse]:
    items = await Integration.list_for_user(db.get_db(), user.uid)
    return [IntegrationResponse(provider=doc["provider"], config=doc.get("config", {})) for doc in items]
