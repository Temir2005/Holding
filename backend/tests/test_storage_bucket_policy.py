from typing import Any

import pytest
from botocore.exceptions import ClientError

from app.core.config import Settings
from app.storage.service import StorageService


class FakeS3:
    def __init__(self, policy_code: str) -> None:
        self.policy_code = policy_code
        self.created = False

    async def __aenter__(self) -> "FakeS3":
        return self

    async def __aexit__(self, *exc: object) -> None:
        return None

    async def head_bucket(self, **_: Any) -> None:
        raise ClientError({"Error": {"Code": "404"}}, "HeadBucket")

    async def create_bucket(self, **_: Any) -> None:
        self.created = True

    async def put_bucket_policy(self, **_: Any) -> None:
        raise ClientError({"Error": {"Code": self.policy_code}}, "PutBucketPolicy")


def make(fake: FakeS3, monkeypatch: pytest.MonkeyPatch) -> StorageService:
    settings = Settings.model_validate(
        {
            "database_url": "postgresql+asyncpg://u:p@db/x",
            "s3_endpoint_url": "http://s3",
            "s3_public_url": "http://localhost",
            "s3_access_key": "k",
            "s3_secret_key": "s",
            "s3_bucket": "media",
        }
    )
    service = StorageService(settings)
    monkeypatch.setattr(service, "_client", lambda endpoint_url=None: fake)
    return service


async def test_ensure_public_bucket_tolerates_not_implemented_policy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = FakeS3("NotImplemented")
    await make(fake, monkeypatch).ensure_public_bucket()
    assert fake.created


async def test_ensure_public_bucket_raises_other_policy_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with pytest.raises(ClientError):
        await make(FakeS3("AccessDenied"), monkeypatch).ensure_public_bucket()
