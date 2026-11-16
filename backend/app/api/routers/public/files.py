"""Media served through the backend, for private buckets without public read access."""

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse

from app.api.cache import matches
from app.api.deps import StorageDep

router = APIRouter(tags=["files"])

CACHE_CONTROL = "public, max-age=86400"


@router.get("/files/{bucket}/{key:path}", include_in_schema=False)
async def get_file(bucket: str, key: str, request: Request, storage: StorageDep) -> Response:
    if bucket != storage.bucket or not key or ".." in key.split("/"):
        raise HTTPException(404, "File not found")
    info = await storage.head(key)
    if info is None:
        raise HTTPException(404, "File not found")
    headers = {"Cache-Control": CACHE_CONTROL}
    if info.etag:
        headers["ETag"] = info.etag
        if matches(request.headers.get("if-none-match"), info.etag):
            return Response(status_code=304, headers=headers)
    headers["Content-Length"] = str(info.size)
    return StreamingResponse(
        storage.stream(key),
        media_type=info.content_type or "application/octet-stream",
        headers=headers,
    )
