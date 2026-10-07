from app.storage.service import ObjectInfo


class InMemoryStorage:
    """Dict-backed stand-in for S3 in tests. Counts bytes read to check range reads."""

    def __init__(self, bucket: str = "test", public_base: str = "http://localhost:9000") -> None:
        self.bucket = bucket
        self.public_base = public_base
        self.objects: dict[str, tuple[bytes, str]] = {}
        self.bytes_read = 0

    def public_url(self, key: str, bucket: str | None = None) -> str:
        return f"{self.public_base}/{bucket or self.bucket}/{key}"

    async def upload(self, key: str, body: bytes, content_type: str) -> None:
        self.objects[key] = (body, content_type)

    async def presigned_put_url(self, key: str, content_type: str, expires: int = 900) -> str:
        return f"{self.public_url(key)}?signed=1&content-type={content_type}&expires={expires}"

    async def head(self, key: str) -> ObjectInfo | None:
        found = self.objects.get(key)
        return ObjectInfo(size=len(found[0]), content_type=found[1]) if found else None

    async def read(self, key: str) -> bytes:
        body = self.objects[key][0]
        self.bytes_read += len(body)
        return body

    async def read_range(self, key: str, start: int, end: int) -> bytes:
        chunk = self.objects[key][0][start : end + 1]
        self.bytes_read += len(chunk)
        return chunk

    async def delete(self, *keys: str) -> None:
        for key in keys:
            self.objects.pop(key, None)

    async def ensure_public_bucket(self) -> None:
        return None

    async def ping(self) -> bool:
        return True
