from httpx import AsyncClient

from app.storage.memory import InMemoryStorage

KEY = "media/2026/a.webp"


async def stored(storage: InMemoryStorage) -> None:
    await storage.upload(KEY, b"webp-bytes" * 1000, "image/webp")


async def test_files_serves_object(client: AsyncClient, storage: InMemoryStorage) -> None:
    await stored(storage)
    r = await client.get(f"/api/v1/files/{storage.bucket}/{KEY}")

    assert r.status_code == 200
    assert r.content == b"webp-bytes" * 1000
    assert r.headers["content-type"] == "image/webp"
    assert r.headers["cache-control"] == "public, max-age=86400"
    assert r.headers["etag"]


async def test_files_rejects_other_bucket(client: AsyncClient, storage: InMemoryStorage) -> None:
    await stored(storage)
    assert (await client.get(f"/api/v1/files/other-bucket/{KEY}")).status_code == 404


async def test_files_missing_key_404(client: AsyncClient, storage: InMemoryStorage) -> None:
    assert (await client.get(f"/api/v1/files/{storage.bucket}/nope.webp")).status_code == 404


async def test_files_if_none_match_304(client: AsyncClient, storage: InMemoryStorage) -> None:
    await stored(storage)
    url = f"/api/v1/files/{storage.bucket}/{KEY}"
    etag = (await client.get(url)).headers["etag"]

    r = await client.get(url, headers={"If-None-Match": etag})

    assert r.status_code == 304
    assert r.content == b""


async def test_files_rejects_dotdot(client: AsyncClient, storage: InMemoryStorage) -> None:
    await stored(storage)
    for path in ("media/%2e%2e/2026/a.webp", "%2e%2e/etc/passwd", "media/%2E%2E/a.webp"):
        r = await client.get(f"/api/v1/files/{storage.bucket}/{path}")
        assert r.status_code == 404, path
