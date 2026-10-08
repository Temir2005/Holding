"""StorageService against S3 settings; nothing here talks to the network."""

from urllib.parse import parse_qs, urlparse

from app.core.config import Settings
from app.storage.service import StorageService


def settings(**overrides: str) -> Settings:
    values = {
        "database_url": "postgresql+asyncpg://u:p@db/x",
        "s3_endpoint_url": "http://minio:9000",
        "s3_public_url": "http://localhost:9000",
        "s3_access_key": "key",
        "s3_secret_key": "secret",
        "s3_bucket": "media",
        # Explicit, so a value from the developer's .env cannot leak into the test.
        "s3_presign_endpoint_url": "",
        **overrides,
    }
    return Settings.model_validate(values)


async def test_upload_link_points_to_the_public_host() -> None:
    """The browser cannot reach the docker-internal endpoint, so the link must not use it."""
    url = await StorageService(settings()).presigned_put_url("media/a.jpg", "image/jpeg")

    parsed = urlparse(url)
    assert (parsed.scheme, parsed.netloc) == ("http", "localhost:9000")
    assert parsed.path == "/media/media/a.jpg"
    assert "X-Amz-Signature" in parse_qs(parsed.query)


async def test_upload_link_host_can_be_set_separately() -> None:
    storage = StorageService(settings(s3_presign_endpoint_url="https://s3.megasmart.example"))
    url = await storage.presigned_put_url("media/a.jpg", "image/jpeg")

    assert urlparse(url).netloc == "s3.megasmart.example"
    # Public image URLs still use S3_PUBLIC_URL.
    assert storage.public_url("media/a.jpg").startswith("http://localhost:9000/")
