"""S3-compatible object storage (MinIO locally; AWS / Yandex / PS Cloud in production)."""

import json
from functools import lru_cache
from typing import Any

import aioboto3

from app.core.config import Settings, get_settings


class StorageService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._session = aioboto3.Session()
        self.bucket = settings.s3_bucket

    def _client(self) -> Any:
        return self._session.client(
            "s3",
            endpoint_url=self._settings.s3_endpoint_url,
            aws_access_key_id=self._settings.s3_access_key,
            aws_secret_access_key=self._settings.s3_secret_key,
            region_name=self._settings.s3_region,
        )

    def public_url(self, key: str, bucket: str | None = None) -> str:
        """URL the browser loads. Swap for a CDN or presigned GET here, not in callers."""
        base = self._settings.s3_public_url.rstrip("/")
        return f"{base}/{bucket or self.bucket}/{key}"

    async def upload(self, key: str, body: bytes, content_type: str) -> None:
        async with self._client() as s3:
            await s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=body,
                ContentType=content_type,
                CacheControl="public, max-age=31536000, immutable",
            )

    async def presigned_put_url(self, key: str, content_type: str, expires: int = 900) -> str:
        """For the admin upload flow: the browser PUTs the file straight to S3."""
        async with self._client() as s3:
            url: str = await s3.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type},
                ExpiresIn=expires,
            )
            return url

    async def ensure_public_bucket(self) -> None:
        """Create the bucket if needed and allow anonymous reads (images are public)."""
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{self.bucket}/*"],
                }
            ],
        }
        async with self._client() as s3:
            try:
                await s3.head_bucket(Bucket=self.bucket)
            except Exception:
                await s3.create_bucket(Bucket=self.bucket)
            await s3.put_bucket_policy(Bucket=self.bucket, Policy=json.dumps(policy))

    async def ping(self) -> bool:
        try:
            async with self._client() as s3:
                await s3.head_bucket(Bucket=self.bucket)
            return True
        except Exception:
            return False


@lru_cache
def get_storage() -> StorageService:
    return StorageService(get_settings())
