"""Collection forms for the admin UI (GET /admin/entity-types) and what saving checks."""

from typing import Any

import pytest
from httpx import AsyncClient
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser
from app.schemas.admin import collections as s
from app.schemas.admin.collection_forms import COLLECTION_FORMS
from tests.conftest import auth_header
from tests.test_collections_admin import create
from tests.test_media_accept import details, media_of

ADMIN = "/api/v1/admin"

UPDATES: dict[str, type[BaseModel]] = {
    "division": s.DivisionUpdate,
    "project": s.ProjectUpdate,
    "person": s.PersonUpdate,
    "client": s.ClientUpdate,
    "timeline_event": s.TimelineEventUpdate,
    "stat": s.StatUpdate,
    "vacancy": s.VacancyUpdate,
}
# Saved by its own endpoint (PUT /projects/{id}/gallery), edited in the same form.
EXTRA_FIELDS = {"project": {"gallery"}}


@pytest.mark.parametrize("entity", sorted(UPDATES))
def test_collection_forms_match_what_patch_accepts(entity: str) -> None:
    _, form = COLLECTION_FORMS[entity]
    expected = set(UPDATES[entity].model_fields) - {"version"}
    assert set(form.model_fields) == expected | EXTRA_FIELDS.get(entity, set())


async def entity_types(client: AsyncClient, editor: AdminUser) -> dict[str, Any]:
    res = await client.get(f"{ADMIN}/entity-types", headers=auth_header(editor))
    assert res.status_code == 200
    return {t["type"]: t for t in res.json()}


async def test_entity_types_describe_every_collection(
    client: AsyncClient, editor: AdminUser
) -> None:
    types = await entity_types(client, editor)
    assert {e: types[e]["label"] for e in UPDATES} == {
        "division": "Направление",
        "project": "Проект",
        "person": "Сотрудник",
        "client": "Клиент",
        "timeline_event": "Событие истории",
        "stat": "Цифра",
        "vacancy": "Вакансия",
    }
    for entity in UPDATES:
        props = types[entity]["schema"]["properties"]
        untitled = [name for name, p in props.items() if not p.get("title")]
        assert untitled == [], entity

    project = types["project"]["schema"]["properties"]
    assert project["gallery"]["x-ref"] == {"kind": "media", "many": True, "accept": ["image"]}
    assert project["division_id"]["x-ref"] == {"kind": "division", "many": False}
    assert project["tags"]["x-widget"] == "tags"
    assert project["body"]["x-widget"] == "markdown"
    assert project["status"]["x-enum-labels"]["in_progress"] == "Строится"

    stat = types["stat"]["schema"]["properties"]["context"]
    assert (stat["x-widget"], stat["x-options"]) == ("combobox", "stat_contexts")
    industry = types["client"]["schema"]["properties"]["industry"]
    assert (industry["x-widget"], industry["x-options"]) == ("combobox", "client_industries")
    division = types["division"]["schema"]["properties"]
    assert division["page_slug"]["x-widget"] == "page"
    assert division["logo_id"]["x-ref"]["accept"] == ["image", "svg"]


async def test_meta_offers_the_client_industries_in_use(
    client: AsyncClient, editor: AdminUser
) -> None:
    h = auth_header(editor)
    for name, industry, label in (
        ("Банк", "finance", "Финансы"),
        ("Завод", "industry", "Промышленность"),
        ("Фонд", "finance", "Финансы и инвестиции"),
    ):
        await create(
            client, h, "clients",
            {"name": {"ru": name}, "industry": industry, "industry_label": {"ru": label}},
        )  # fmt: skip
    meta = (await client.get(f"{ADMIN}/meta", headers=h)).json()
    assert meta["client_industries"] == [
        {"value": "finance", "label": "Финансы"},
        {"value": "industry", "label": "Промышленность"},
    ]


async def test_collection_media_fields_take_only_fitting_files(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    svg = await media_of(session, "image/svg+xml", "logo.svg")
    video = await media_of(session, "video/mp4", "clip.mp4")
    photo = await media_of(session, "image/jpeg", "photo.jpg")

    res = await client.post(
        f"{ADMIN}/people", headers=h, json={"full_name": {"ru": "Имя"}, "photo_id": svg}
    )
    assert details(res) == [
        {"loc": ["body", "photo_id"], "msg": "сюда подходит: фото; выбран файл: SVG"}
    ]
    # A logo may be an SVG.
    body = {"name": {"ru": "К"}, "industry": "it", "industry_label": {"ru": "IT"}}
    logo = await client.post(f"{ADMIN}/clients", headers=h, json={**body, "logo_id": svg})
    assert logo.status_code == 201, logo.text

    project = await create(client, h, "projects", {"slug": "p", "title": {"ru": "П"}})
    gallery = await client.put(
        f"{ADMIN}/projects/{project['id']}/gallery",
        headers=h,
        json={"version": project["version"], "media_ids": [photo, video]},
    )
    assert details(gallery) == [
        {"loc": ["body", "media_ids", 1], "msg": "сюда подходит: фото; выбран файл: видео"}
    ]
    cover = await client.patch(
        f"{ADMIN}/projects/{project['id']}",
        headers=h,
        json={"version": project["version"], "cover_id": video},
    )
    assert details(cover)[0]["loc"] == ["body", "cover_id"]
