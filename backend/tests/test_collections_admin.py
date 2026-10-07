import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, Page
from tests.conftest import auth_header
from tests.test_pages_admin import ready_media

ADMIN = "/api/v1/admin"


async def create(
    client: AsyncClient, h: dict[str, str], path: str, body: dict[str, Any]
) -> dict[str, Any]:
    res = await client.post(f"{ADMIN}/{path}", headers=h, json=body)
    assert res.status_code == 201, res.text
    return dict(res.json())


# --- projects ----------------------------------------------------------------------


async def test_project_lifecycle_and_public_visibility(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    cover = await ready_media(session, "cover.jpg")
    division = await create(client, h, "divisions", {"slug": "dev", "name": {"ru": "Development"}})
    project = await create(
        client, h, "projects",
        {
            "slug": "aaag", "title": {"ru": "AAAG", "en": "AAAG"}, "division_id": division["id"],
            "status": "in_progress", "cover_id": str(cover.id), "area_m2": 1200.5, "year": 2026,
            "body": {"ru": "## О проекте", "kk": None}, "tags": ["Alatau City"],
        },
    )  # fmt: skip
    assert project["is_published"] is False
    assert project["cover"]["title"] == "cover.jpg"
    assert project["division"]["title"] == "Development"
    assert project["body"] == {"ru": "## О проекте"}  # empty languages are not stored
    assert (await client.get("/api/v1/projects")).json() == []

    published = await client.patch(
        f"{ADMIN}/projects/{project['id']}", headers=h, json={"version": 1, "is_published": True}
    )
    assert published.json()["version"] == 2
    public = (await client.get("/api/v1/projects")).json()
    assert [p["slug"] for p in public] == ["aaag"]

    dup = await client.post(
        f"{ADMIN}/projects", headers=h, json={"slug": "aaag", "title": {"ru": "x"}}
    )
    assert dup.json()["error"]["code"] == "ALREADY_EXISTS"

    listed = await client.get(
        f"{ADMIN}/projects", headers=h, params={"status": "in_progress", "q": "aaag"}
    )
    assert listed.json()["total"] == 1
    assert (await client.get(f"{ADMIN}/projects", headers=h, params={"status": "planned"})).json()[
        "total"
    ] == 0


async def test_project_references_must_exist(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    pending = await ready_media(session, status="pending")
    body = {
        "slug": "x",
        "title": {"ru": "X"},
        "cover_id": str(pending.id),
        "division_id": str(uuid.uuid4()),
    }
    res = await client.post(f"{ADMIN}/projects", headers=h, json=body)
    assert res.status_code == 422
    assert {tuple(e["loc"]) for e in res.json()["error"]["details"]} == {
        ("body", "cover_id"),
        ("body", "division_id"),
    }


async def test_project_gallery(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    a, b = await ready_media(session, "a.jpg"), await ready_media(session, "b.jpg")
    # Plain ids: a failed request rolls back the shared test session and expires the objects.
    a_id, b_id = str(a.id), str(b.id)
    project = await create(client, h, "projects", {"slug": "p", "title": {"ru": "P"}})

    res = await client.put(
        f"{ADMIN}/projects/{project['id']}/gallery", headers=h,
        json={"version": 1, "media_ids": [b_id, a_id]},
    )  # fmt: skip
    assert [c["title"] for c in res.json()["gallery"]] == ["b.jpg", "a.jpg"]
    assert res.json()["version"] == 2

    stale = await client.put(
        f"{ADMIN}/projects/{project['id']}/gallery", headers=h, json={"version": 1, "media_ids": []}
    )
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"
    bad = await client.put(
        f"{ADMIN}/projects/{project['id']}/gallery", headers=h,
        json={"version": 2, "media_ids": [a_id, str(uuid.uuid4())]},
    )  # fmt: skip
    assert bad.json()["error"]["details"][0]["loc"] == ["body", "media_ids", 1]

    # A file in a gallery cannot be deleted.
    media_version = (await client.get(f"{ADMIN}/media/{a_id}", headers=h)).json()["version"]
    gone = await client.delete(
        f"{ADMIN}/media/{a_id}", headers=h, params={"version": media_version}
    )
    assert gone.json()["error"]["code"] == "IN_USE"


async def test_project_used_on_a_page_cannot_be_deleted_or_renamed(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    project = await create(client, h, "projects", {"slug": "birlik", "title": {"ru": "Birlik"}})
    page = await create(client, h, "pages", {"slug": "home", "title": {"ru": "Главная"}})
    await client.post(
        f"{ADMIN}/pages/{page['id']}/sections", headers=h,
        json={
            "type": "projects_showcase",
            "data": {
                "project_ids": [project["id"]],
                "link": {"label": {"ru": "Birlik"}, "href": "projects/birlik"},
            },
        },
    )  # fmt: skip
    res = await client.delete(f"{ADMIN}/projects/{project['id']}", headers=h, params={"version": 1})
    assert res.json()["error"]["code"] == "IN_USE"
    assert {u["field"] for u in res.json()["error"]["details"]} == {"data", "data.link.href"}

    rename = await client.patch(
        f"{ADMIN}/projects/{project['id']}", headers=h, json={"version": 1, "slug": "birlik-2"}
    )
    assert rename.json()["error"]["code"] == "IN_USE"


# --- divisions ---------------------------------------------------------------------


async def test_division_with_projects_cannot_be_deleted(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    division = await create(client, h, "divisions", {"slug": "sp", "name": {"ru": "Smart Panels"}})
    await create(
        client,
        h,
        "projects",
        {"slug": "z", "title": {"ru": "Завод"}, "division_id": division["id"]},
    )
    res = await client.delete(
        f"{ADMIN}/divisions/{division['id']}", headers=h, params={"version": 1}
    )
    assert res.json()["error"]["code"] == "IN_USE"
    assert res.json()["error"]["details"][0]["entity_type"] == "project"


async def test_division_page_link_must_exist(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    bad = await client.post(
        f"{ADMIN}/divisions",
        headers=h,
        json={"slug": "d", "name": {"ru": "D"}, "page_slug": "nope"},
    )
    assert bad.json()["error"]["details"][0]["loc"] == ["body", "page_slug"]
    session.add(Page(slug="smart-panels", title={"ru": "SP"}))
    await session.commit()
    ok = await client.post(
        f"{ADMIN}/divisions", headers=h,
        json={
            "slug": "d", "name": {"ru": "D"}, "page_slug": "smart-panels",
            "stats": [{"value": 30000, "suffix": {"ru": "м²"}, "label": {"ru": "мощностей"}}],
            "website_url": "https://smartpanels.kz",
        },
    )  # fmt: skip
    assert ok.status_code == 201, ok.text
    assert ok.json()["stats"] == [
        {"value": 30000.0, "suffix": {"ru": "м²"}, "label": {"ru": "мощностей"}}
    ]
    assert ok.json()["website_url"] == "https://smartpanels.kz/"


# --- every collection: same contract ------------------------------------------------

CASES = [
    ("divisions", lambda i: {"slug": f"d{i}", "name": {"ru": f"Направление {i}"}}, "name"),
    ("projects", lambda i: {"slug": f"p{i}", "title": {"ru": f"Проект {i}"}}, "title"),
    (
        "people",
        lambda i: {"full_name": {"ru": f"Имя {i}"}, "position": {"ru": "Инженер"}},
        "full_name",
    ),
    (
        "clients",
        lambda i: {
            "name": {"ru": f"Клиент {i}"},
            "industry": "furniture",
            "industry_label": {"ru": "Мебель"},
        },
        "name",
    ),
    ("timeline-events", lambda i: {"year": 2000 + i, "title": {"ru": f"Событие {i}"}}, "title"),
    ("stats", lambda i: {"value": i, "label": {"ru": f"Цифра {i}"}, "context": "home"}, "label"),
    ("vacancies", lambda i: {"title": {"ru": f"Вакансия {i}"}}, "title"),
]


@pytest.mark.parametrize(("path", "payload", "text_field"), CASES, ids=[c[0] for c in CASES])
async def test_collection_contract(
    client: AsyncClient, editor: AdminUser, path: str, payload: Any, text_field: str
) -> None:
    h = auth_header(editor)
    rows = [await create(client, h, path, payload(i)) for i in range(3)]
    assert [r["version"] for r in rows] == [1, 1, 1]
    assert rows[0]["sort_order"] < rows[1]["sort_order"] < rows[2]["sort_order"]

    listed = (await client.get(f"{ADMIN}/{path}", headers=h, params={"page_size": 2})).json()
    assert (listed["total"], len(listed["items"]), listed["page_size"]) == (3, 2, 2)

    one = rows[1]
    edited = await client.patch(
        f"{ADMIN}/{path}/{one['id']}", headers=h,
        json={"version": 1, text_field: {"ru": "Изменено", "en": "Changed"}, "is_published": True},
    )  # fmt: skip
    assert edited.status_code == 200, edited.text
    assert edited.json()[text_field] == {"ru": "Изменено", "en": "Changed"}
    assert (edited.json()["version"], edited.json()["is_published"]) == (2, True)

    stale = await client.patch(
        f"{ADMIN}/{path}/{one['id']}", headers=h, json={"version": 1, "is_published": False}
    )
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"

    found = (await client.get(f"{ADMIN}/{path}", headers=h, params={"q": "измен"})).json()
    assert [r["id"] for r in found["items"]] == [one["id"]]
    only_published = (
        await client.get(f"{ADMIN}/{path}", headers=h, params={"is_published": True})
    ).json()
    assert only_published["total"] == 1

    new_order = [rows[2]["id"], rows[0]["id"], rows[1]["id"]]
    assert (
        await client.put(f"{ADMIN}/{path}/order", headers=h, json={"ids": new_order})
    ).status_code == 204
    if path != "timeline-events":  # history is ordered by year
        ordered = (await client.get(f"{ADMIN}/{path}", headers=h)).json()["items"]
        assert [r["id"] for r in ordered] == new_order

    deleted = await client.delete(
        f"{ADMIN}/{path}/{rows[0]['id']}", headers=h, params={"version": 1}
    )
    assert deleted.status_code == 204
    assert (await client.get(f"{ADMIN}/{path}/{rows[0]['id']}", headers=h)).status_code == 404


async def test_used_person_cannot_be_deleted(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    person = await create(client, h, "people", {"full_name": {"ru": "Сергей Хегай"}})
    page = await create(client, h, "pages", {"slug": "team", "title": {"ru": "Команда"}})
    await client.post(
        f"{ADMIN}/pages/{page['id']}/sections", headers=h,
        json={"type": "quote", "data": {"text": {"ru": "Цитата"}, "person_id": person["id"]}},
    )  # fmt: skip
    res = await client.delete(f"{ADMIN}/people/{person['id']}", headers=h, params={"version": 1})
    assert res.json()["error"]["code"] == "IN_USE"


async def test_stats_filter_by_context(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    await create(client, h, "stats", {"value": 20, "label": {"ru": "лет"}, "context": "home"})
    await create(
        client, h, "stats", {"value": 30, "label": {"ru": "дилеров"}, "context": "smart-panels"}
    )
    res = (await client.get(f"{ADMIN}/stats", headers=h, params={"context": "smart-panels"})).json()
    assert [r["label"]["ru"] for r in res["items"]] == ["дилеров"]


async def test_client_testimonial_and_filter(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    await create(
        client, h, "clients",
        {
            "name": {"ru": "Альфа"}, "industry": "dealer", "industry_label": {"ru": "Дилеры"},
            "testimonial": {"quote": {"ru": "Отлично"}, "author": {"ru": "Имя"}},
        },
    )  # fmt: skip
    await create(
        client,
        h,
        "clients",
        {"name": {"ru": "Бета"}, "industry": "dealer", "industry_label": {"ru": "Дилеры"}},
    )
    with_quote = (
        await client.get(f"{ADMIN}/clients", headers=h, params={"has_testimonial": True})
    ).json()
    assert [c["name"]["ru"] for c in with_quote["items"]] == ["Альфа"]
    assert with_quote["items"][0]["testimonial"] == {
        "quote": {"ru": "Отлично"},
        "author": {"ru": "Имя"},
        "position": None,
    }


@pytest.mark.parametrize("path", ["projects", "people", "stats"])
async def test_collections_need_a_token(client: AsyncClient, path: str) -> None:
    assert (await client.get(f"{ADMIN}/{path}")).status_code == 401
