from typing import Any

import pytest
from pydantic import ValidationError

from app.core.config import Settings

BASE: dict[str, Any] = {
    "database_url": "postgresql+asyncpg://u:p@db/x",
    "s3_endpoint_url": "http://minio:9000",
    "s3_public_url": "http://localhost:9000",
    "s3_access_key": "k",
    "s3_secret_key": "s",
    "s3_bucket": "b",
}
STRONG = "x" * 40


def make(**overrides: str) -> Settings:
    # model_validate runs the validators without reading the environment or .env.
    return Settings.model_validate({**BASE, **overrides})


def test_dev_allows_placeholder_secrets() -> None:
    assert make(app_env="dev", jwt_secret="change-me").is_dev


@pytest.mark.parametrize(
    "overrides",
    [
        {"jwt_secret": "change-me", "lead_ip_salt": STRONG},
        {"jwt_secret": STRONG, "lead_ip_salt": "change-me"},
        {"jwt_secret": "short", "lead_ip_salt": STRONG},
    ],
)
def test_production_refuses_weak_secrets(overrides: dict[str, str]) -> None:
    with pytest.raises(ValidationError, match="strong values"):
        make(app_env="production", **overrides)


def test_production_accepts_strong_secrets() -> None:
    assert not make(app_env="production", jwt_secret=STRONG, lead_ip_salt=STRONG).is_dev


def test_postgres_url_is_converted_to_asyncpg() -> None:
    assert make(database_url="postgres://u:p@db/x").database_url.startswith("postgresql+asyncpg://")
