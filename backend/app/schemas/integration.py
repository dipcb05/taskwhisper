from typing import Any
from pydantic import BaseModel, Field

from .cloud import CloudVoiceNotePayload


class IntegrationConfig(BaseModel):
    provider: str
    config: dict[str, Any] = Field(default_factory=dict)


class IntegrationResponse(BaseModel):
    provider: str
    config: dict[str, Any]


class IntegrationFieldResponse(BaseModel):
    key: str
    label: str
    required: bool = True
    secret: bool = False
    oauth_managed: bool = False
    placeholder: str | None = None
    help_text: str | None = None


class IntegrationCatalogItem(BaseModel):
    provider: str
    name: str
    description: str
    oauth_supported: bool = False
    oauth_label: str | None = None
    fields: list[IntegrationFieldResponse] = Field(default_factory=list)


class IntegrationSyncRequest(BaseModel):
    provider: str
    notes: list[CloudVoiceNotePayload] = Field(default_factory=list)


class IntegrationSyncResponse(BaseModel):
    provider: str
    results: list[dict[str, Any]] = Field(default_factory=list)
