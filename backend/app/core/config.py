from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Talkr API"
    api_prefix: str = "/api"
    frontend_origin: str = "http://localhost:3000"

    mongo_uri: str = "mongodb://mongo:27017"
    mongo_db: str = "talkr"

    redis_url: str | None = "redis://redis:6379/0"

    firebase_project_id: str | None = None
    allow_insecure_auth: bool = False

    file_storage_path: str = "/tmp/talkr_uploads"

    task_timeout_seconds: int = 120
    request_timeout_seconds: int = 30

    cache_ttl_seconds: int = 3600

    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
