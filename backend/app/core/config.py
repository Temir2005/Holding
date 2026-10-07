from functools import lru_cache
from typing import Self

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Values that must never reach production.
WEAK_SECRETS = {"", "change-me", "changeme", "secret"}
MIN_SECRET_LENGTH = 32


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
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30
    login_rate_limit_per_minute: int = 10
    # Refresh tokens revoked longer ago than this are deleted by `app.cli cleanup`.
    # Kept a while so a replayed token is still recognized and its session revoked.
    revoked_token_retention_days: int = 7

    media_max_image_mb: int = 20  # images, SVG and PDF
    media_max_video_mb: int = 200
    media_upload_url_ttl_seconds: int = 900
    # Uploads never completed are removed after this long.
    media_pending_ttl_hours: int = 24
    media_variant_widths: list[int] = [480, 960, 1600, 2400]

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

    @model_validator(mode="after")
    def require_strong_secrets(self) -> Self:
        """Outside dev, refuse to start with placeholder or short secrets."""
        if self.is_dev:
            return self
        weak = [
            name
            for name in ("jwt_secret", "lead_ip_salt")
            if getattr(self, name) in WEAK_SECRETS or len(getattr(self, name)) < MIN_SECRET_LENGTH
        ]
        if weak:
            raise ValueError(
                f"APP_ENV={self.app_env}: set strong values (>= {MIN_SECRET_LENGTH} chars) "
                f"for {', '.join(n.upper() for n in weak)}"
            )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.app_env == "dev"


@lru_cache
def get_settings() -> Settings:
    return Settings()
