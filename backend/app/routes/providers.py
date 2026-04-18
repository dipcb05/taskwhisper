from typing import Annotated

from fastapi import APIRouter, Header

from ..services.provider_catalog import ProviderCatalogService

router = APIRouter(prefix="/providers", tags=["providers"])
catalog_service = ProviderCatalogService()


@router.get("/{provider}/models")
async def list_models(
    provider: str,
    x_api_key: Annotated[str | None, Header(alias="x-api-key")] = None,
) -> dict[str, object]:
    return await catalog_service.list_models(provider, x_api_key)
