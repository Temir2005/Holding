"""Required fields stay required: an empty Russian text or a null in a PATCH is refused,
instead of being stored as {} (empty languages are dropped on save)."""

from typing import Any

import pytest
from httpx import AsyncClient

from app.models import AdminUser
from tests.conftest import auth_header

ADMIN = "/api/v1/admin"

CLIENT = {"name": {"ru": "Клиент"}, "industry": "retail", "industry_label": {"ru": "Ритейл"}}

# Collection path, a valid body, and the required localized field to empty.
CASES: list[tuple[str, dict[str, Any], str]] = [
    ("pages", {"slug": "about", "title": {"ru": "О нас"}}, "title"),
    ("divisions", {"slug": "dev", "name": {"ru": "Девелопмент"}}, "name"),
    ("projects", {"slug": "p", "title": {"ru": "Проект"}}, "title"),
    ("people", {"full_name": {"ru": "Имя Фамилия"}}, "full_name"),
    ("clients", CLIENT, "name"),
    ("clients", CLIENT, "industry_label"),
    ("timeline-events", {"year": 2004, "title": {"ru": "Основание"}}, "title"),
    ("stats", {"value": 20, "label": {"ru": "лет"}, "context": "home"}, "label"),
    ("vacancies", {"title": {"ru": "Инженер"}}, "title"),
]
IDS = [f"{path}.{name}" for path, _, name in CASES]


def error_locs(body: dict[str, Any]) -> set[tuple[str | int, ...]]:
    assert body["error"]["code"] == "VALIDATION_ERROR", body
    return {tuple(e["loc"]) for e in body["error"]["details"]}


@pytest.mark.parametrize("empty", ["", "   "])
@pytest.mark.parametrize(("path", "body", "name"), CASES, ids=IDS)
async def test_create_refuses_empty_russian(
    client: AsyncClient, editor: AdminUser, path: str, body: dict[str, Any], name: str, empty: str
) -> None:
    res = await client.post(
        f"{ADMIN}/{path}", headers=auth_header(editor),
        json={**body, name: {"ru": empty, "kk": "мәтін"}},
    )  # fmt: skip
    assert res.status_code == 422
    assert ("body", name, "ru") in error_locs(res.json())


@pytest.mark.parametrize(("path", "body", "name"), CASES, ids=IDS)
async def test_update_refuses_empty_russian_and_null(
    client: AsyncClient, editor: AdminUser, path: str, body: dict[str, Any], name: str
) -> None:
    h = auth_header(editor)
    created = await client.post(f"{ADMIN}/{path}", headers=h, json=body)
    assert created.status_code == 201, created.text
    url = f"{ADMIN}/{path}/{created.json()['id']}"

    emptied = await client.patch(url, headers=h, json={"version": 1, name: {"ru": ""}})
    assert ("body", name, "ru") in error_locs(emptied.json())
    cleared = await client.patch(url, headers=h, json={"version": 1, name: None})
    assert ("body", name) in error_locs(cleared.json())

    stored = (await client.get(url, headers=h)).json()
    assert stored[name] == body[name]
    assert stored["version"] == 1


async def test_optional_text_can_still_be_cleared(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    division = await client.post(
        f"{ADMIN}/divisions", headers=h,
        json={"slug": "dev", "name": {"ru": "Девелопмент"}, "tagline": {"ru": "Строим"}},
    )  # fmt: skip
    url = f"{ADMIN}/divisions/{division.json()['id']}"

    res = await client.patch(url, headers=h, json={"version": 1, "tagline": None})
    assert res.status_code == 200, res.text
    assert res.json()["tagline"] == {}
    # Only the Russian text is required; other languages may be left empty.
    res = await client.patch(url, headers=h, json={"version": 2, "name": {"ru": "Dev", "kk": ""}})
    assert res.json()["name"] == {"ru": "Dev"}


@pytest.mark.parametrize(
    ("path", "body", "loc"),
    [
        (
            "clients",
            {"name": {"ru": "К"}, "industry": "retail", "industry_label": {"ru": "Р"},
             "testimonial": {"quote": {"ru": "Отлично"}, "author": {"ru": " "}}},
            ("body", "testimonial", "author", "ru"),
        ),
        (
            "divisions",
            {"slug": "dev", "name": {"ru": "Д"}, "stats": [{"value": 5, "label": {"ru": ""}}]},
            ("body", "stats", 0, "label", "ru"),
        ),
    ],
)  # fmt: skip
async def test_nested_required_text(
    client: AsyncClient,
    editor: AdminUser,
    path: str,
    body: dict[str, Any],
    loc: tuple[str | int, ...],
) -> None:
    res = await client.post(f"{ADMIN}/{path}", headers=auth_header(editor), json=body)
    assert loc in error_locs(res.json())


@pytest.mark.parametrize(
    ("path", "body", "field"),
    [
        ("pages", {"slug": "about", "title": {"ru": "О нас"}}, "slug"),
        ("projects", {"slug": "p", "title": {"ru": "П"}}, "status"),
        ("stats", {"value": 1, "label": {"ru": "л"}, "context": "home"}, "context"),
        ("vacancies", {"title": {"ru": "И"}}, "is_published"),
    ],
)
async def test_required_columns_cannot_be_nulled(
    client: AsyncClient, editor: AdminUser, path: str, body: dict[str, Any], field: str
) -> None:
    """Before: a null reached the database and failed there with a 500."""
    h = auth_header(editor)
    created = await client.post(f"{ADMIN}/{path}", headers=h, json=body)
    res = await client.patch(
        f"{ADMIN}/{path}/{created.json()['id']}", headers=h, json={"version": 1, field: None}
    )
    assert ("body", field) in error_locs(res.json())
