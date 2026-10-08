"""S3-compatible object storage (MinIO locally; AWS / Yandex / PS Cloud in production).

`Storage` is the interface the app depends on; `StorageService` talks to S3 and
`InMemoryStorage` (app.storage.memory) stands in for it in tests.
"""

import json
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Protocol

import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import Settings, get_settings


@dataclass(frozen=True)
class ObjectInfo:
    size: int
    content_type: str | None


class Storage(Protocol):
    bucket: str

    def public_url(self, key: str, bucket: str | None = None) -> str: ...
    async def upload(self, key: str, body: bytes, content_type: str) -> None: ...
    async def presigned_put_url(self, key: str, content_type: str, expires: int = 900) -> str: ...
    async def head(self, key: str) -> ObjectInfo | None: ...
    async def read(self, key: str) -> bytes: ...
    async def read_range(self, key: str, start: int, end: int) -> bytes: ...
    async def delete(self, *keys: str) -> None: ...
    async def ensure_public_bucket(self) -> None: ...
    async def ping(self) -> bool: ...


class StorageService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._session = aioboto3.Session()
        self.bucket = settings.s3_bucket

    def _client(self, endpoint_url: str | None = None) -> Any:
        """S3 client for the backend's own calls; `endpoint_url` overrides the address."""
        return self._session.client(
            "s3",
            endpoint_url=endpoint_url or self._settings.s3_endpoint_url,
            aws_access_key_id=self._settings.s3_access_key,
            aws_secret_access_key=self._settings.s3_secret_key,
            region_name=self._settings.s3_region,
            # SigV4 everywhere: boto would sign presigned URLs with legacy SigV2, which
            # many S3 providers reject. SigV4 covers the host, hence a public endpoint.
            config=Config(signature_version="s3v4"),
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
        """For the admin upload flow: the browser PUTs the file straight to S3.

        Content-Type is part of the signature, so the browser must send the same value.
        Size cannot be limited in a PUT signature; it is checked when the upload completes.
        Signed for the public address: the host is part of the signature, and the browser
        cannot reach the docker-internal endpoint. Signing is local, nothing is sent.
        """
        async with self._client(self._settings.presign_endpoint_url) as s3:
            url: str = await s3.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type},
                ExpiresIn=expires,
            )
            return url

    async def head(self, key: str) -> ObjectInfo | None:
        async with self._client() as s3:
            try:
                meta = await s3.head_object(Bucket=self.bucket, Key=key)
            except ClientError as exc:
                if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                    return None
                raise
        return ObjectInfo(size=int(meta["ContentLength"]), content_type=meta.get("ContentType"))

    async def read(self, key: str) -> bytes:
        async with self._client() as s3:
            obj = await s3.get_object(Bucket=self.bucket, Key=key)
            body: bytes = await obj["Body"].read()
            return body

    async def read_range(self, key: str, start: int, end: int) -> bytes:
        """Bytes [start, end] inclusive, without downloading the whole object."""
        async with self._client() as s3:
            obj = await s3.get_object(Bucket=self.bucket, Key=key, Range=f"bytes={start}-{end}")
            body: bytes = await obj["Body"].read()
            return body

    async def delete(self, *keys: str) -> None:
        if not keys:
            return
        async with self._client() as s3:
            await s3.delete_objects(
                Bucket=self.bucket,
                Delete={"Objects": [{"Key": k} for k in keys], "Quiet": True},
            )

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
def get_storage() -> Storage:
    return StorageService(get_settings())
