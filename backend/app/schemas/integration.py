from typing import Any
from pydantic import BaseModel, Field


class IntegrationConfig(BaseModel):
    provider: str
    config: dict[str, Any] = Field(default_factory=dict)


class IntegrationResponse(BaseModel):
    provider: str
    config: dict[str, Any]
