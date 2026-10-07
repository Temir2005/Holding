"""Admin endpoints answer with the error envelope; public ones keep {"detail": ...}."""

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel

from app.api.errors import register_error_handlers
from app.core.errors import NotFound, VersionConflict

app = FastAPI()
register_error_handlers(app)


class Body(BaseModel):
    title: str


@app.post("/api/v1/admin/things")
async def admin_conflict() -> None:
    raise VersionConflict(expected=1, actual=3)


@app.post("/api/v1/admin/validate")
async def admin_validate(body: Body) -> Body:
    return body


@app.get("/api/v1/things")
async def public_missing() -> None:
    raise NotFound("Нет такой записи")


def client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def test_admin_domain_error_uses_envelope() -> None:
    async with client() as c:
        res = await c.post("/api/v1/admin/things")
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "VERSION_CONFLICT"
    assert res.json()["error"]["details"] == {"expected_version": 1, "current_version": 3}


async def test_admin_request_validation_lists_fields() -> None:
    async with client() as c:
        res = await c.post("/api/v1/admin/validate", json={"title": 5})
    assert res.status_code == 422
    error = res.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"][0]["loc"] == ["body", "title"]


async def test_admin_unknown_route_uses_envelope() -> None:
    async with client() as c:
        res = await c.get("/api/v1/admin/nope")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


async def test_public_errors_keep_detail_format() -> None:
    async with client() as c:
        res = await c.get("/api/v1/things")
        missing = await c.get("/api/v1/nope")
    assert res.status_code == 404
    assert res.json() == {"detail": "Нет такой записи"}
    assert missing.json() == {"detail": "Not Found"}
