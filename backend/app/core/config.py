from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    database_url: str
    test_database_url: str | None = None
    cors_origins: str = "http://localhost:5173"

    s3_endpoint_url: str
    s3_public_url: str
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str
    s3_region: str = "us-east-1"

    lead_ip_salt: str = "change-me"
    lead_rate_limit_per_minute: int = 5
    jwt_secret: str = "change-me"

    @field_validator("database_url", "test_database_url")
    @classmethod
    def use_asyncpg(cls, value: str | None) -> str | None:
        """Hosting providers (Railway, Heroku) hand out postgres:// URLs; we need asyncpg."""
        if value is None:
            return None
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+asyncpg://" + value[len(prefix) :]
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.app_env == "dev"


@lru_cache
def get_settings() -> Settings:
    return Settings()
