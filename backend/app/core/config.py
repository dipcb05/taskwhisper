import os
from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    app_name: str = "Talkr API"
    api_prefix: str = "/api"
    frontend_origin: str = "http://localhost:3000"

    local_db_path: str = "./data/taskwhisper-db.json"
    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL"),
    )
    redis_url: str | None = Field(default=None, validation_alias=AliasChoices("REDIS_URL"))
    supabase_url: str | None = Field(default=None, validation_alias=AliasChoices("SUPABASE_URL"))
    supabase_service_role_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"),
    )
    supabase_schema: str = "public"
    vercel_blob_rw_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "BLOB_READ_WRITE_TOKEN",
            "VERCEL_BLOB_RW_TOKEN",
            "taskwhisper_VERCEL_READ_WRITE_TOKEN",
        ),
    )

    firebase_project_id: str | None = None
    firebase_secret_base64: str | None = None
    firebase_client_email: str | None = None
    firebase_private_key: str | None = None
    allow_insecure_auth: bool = False

    file_storage_path: str = "./data/uploads"

    task_timeout_seconds: int = 120
    request_timeout_seconds: int = 30

    cache_ttl_seconds: int = 3600

    log_level: str = "INFO"

    notion_oauth_client_id: str | None = None
    notion_oauth_client_secret: str | None = None
    slack_oauth_client_id: str | None = None
    slack_oauth_client_secret: str | None = None
    google_oauth_client_id: str | None = None
    google_oauth_client_secret: str | None = None
    microsoft_oauth_client_id: str | None = None
    microsoft_oauth_client_secret: str | None = None
    microsoft_oauth_tenant_id: str = "common"
    todoist_oauth_client_id: str | None = None
    todoist_oauth_client_secret: str | None = None

    @property
    def effective_file_storage_path(self) -> str:
        return self.file_storage_path or os.path.join(".", "data", "uploads")


@lru_cache
def get_settings() -> Settings:
    return Settings()
