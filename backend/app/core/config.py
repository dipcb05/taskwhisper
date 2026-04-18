from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    app_name: str = "Talkr API"
    api_prefix: str = "/api"
    frontend_origin: str = "http://localhost:3000"

    local_db_path: str = "./data/taskwhisper-db.json"

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
