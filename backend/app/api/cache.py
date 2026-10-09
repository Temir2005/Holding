"""HTTP caching headers.

Public GET responses: `Cache-Control: public, max-age=0, must-revalidate` plus an ETag
(a hash of the body). Browsers and CDNs keep the copy but ask every time; an unchanged
page costs a 304 without a body, and a published change is visible at once.

Admin and preview responses are never stored (`no-store`): they show drafts and
personal data. Response bodies are not changed.
"""

import hashlib
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

PRIVATE_PREFIXES = ("/api/v1/admin", "/api/v1/preview")
PUBLIC_PREFIX = "/api/v1/"
SKIP = ("/api/v1/health",)
REVALIDATE = "public, max-age=0, must-revalidate"


def etag_for(body: bytes) -> str:
    return '"' + hashlib.sha256(body).hexdigest()[:32] + '"'


def matches(if_none_match: str | None, etag: str) -> bool:
    if not if_none_match:
        return False
    candidates = {tag.strip().removeprefix("W/") for tag in if_none_match.split(",")}
    return etag in candidates or "*" in candidates


def register_cache_headers(app: FastAPI) -> None:
    @app.middleware("http")
    async def cache_headers(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        path = request.url.path
        if path.startswith(PRIVATE_PREFIXES):
            response.headers["Cache-Control"] = "no-store"
            return response
        if (
            request.method != "GET"
            or response.status_code != 200
            or not path.startswith(PUBLIC_PREFIX)
            or path.startswith(SKIP)
        ):
            return response

        # `call_next` hands back a streamed body; public responses are small JSON, so it
        # is collected to hash it.
        chunks = getattr(response, "body_iterator", None)
        if chunks is None:
            return response
        body = b"".join([c if isinstance(c, bytes) else str(c).encode() async for c in chunks])
        etag = etag_for(body)
        headers = dict(response.headers)
        headers.pop("content-length", None)
        headers["ETag"] = etag
        headers["Cache-Control"] = REVALIDATE
        if matches(request.headers.get("if-none-match"), etag):
            return Response(status_code=304, headers={"ETag": etag, "Cache-Control": REVALIDATE})
        return Response(
            content=body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
        )
