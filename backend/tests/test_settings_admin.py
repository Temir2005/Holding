"""Site settings in the admin: read, replace as a whole, checks on save, admin only."""

import copy
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, Page, SiteSettings
from tests.conftest import auth_header
from tests.test_pages_admin import make_page, ready_media

SETTINGS = "/api/v1/admin/settings"


@pytest.fixture
async def site(session: AsyncSession) -> SiteSettings:
    """A settings row the way the seeds write it, with the page its menu leads to."""
    session.add(Page(slug="home", title={"ru": "Главная"}, is_published=True))
    row = SiteSettings(
        site_name={"ru": "MegaSmart"},
        navigation=[
            {"label": {"ru": "Холдинг"}, "page_slug": "home"},
            {"label": {"ru": "Контакты"}, "anchor": "contacts"},
        ],
        contacts={"address": {"ru": "Шымкент"}, "phones": ["+7 777 105 00 44"]},
        socials=[{"type": "instagram", "url": "https://instagram.com/"}],
        footer={"text": {"ru": "Холдинг"}, "legal": {"ru": "© MegaSmart"}},
        default_seo={"title": {"ru": "MegaSmart"}, "description": {"ru": "Холдинг"}},
    )
    session.add(row)
    await session.commit()
    return row


async def editable(client: AsyncClient, h: dict[str, str]) -> dict[str, Any]:
    """GET → the body for PUT: the same document with its version."""
    read = (await client.get(SETTINGS, headers=h)).json()
    return {k: v for k, v in read.items() if k not in {"id", "refs", "updated_at"}}


def error_locs(body: dict[str, Any]) -> set[tuple[str | int, ...]]:
    assert body["error"]["code"] == "VALIDATION_ERROR", body
    return {tuple(e["loc"]) for e in body["error"]["details"]}


async def test_read_edit_and_public_result(
    client: AsyncClient, admin: AdminUser, session: AsyncSession, site: SiteSettings
) -> None:
    h = auth_header(admin)
    await make_page(client, h, "projects")
    logo = await ready_media(session, "logo.svg")
    body = await editable(client, h)
    assert body["version"] == 1
    assert body["navigation"][0]["label"] == {"ru": "Холдинг", "kk": None, "en": None}

    body["site_name"] = {"ru": "MegaSmart Holding", "kk": "MegaSmart холдингі"}
    body["logo_id"] = str(logo.id)
    body["navigation"].insert(1, {"label": {"ru": "Проекты"}, "page_slug": "projects"})
    body["socials"].append({"type": "telegram", "url": "https://t.me/megasmart"})
    res = await client.put(SETTINGS, headers=h, json=body)
    assert res.status_code == 200, res.text
    saved = res.json()
    assert saved["version"] == 2
    assert saved["refs"]["media"][str(logo.id)]["title"] == "logo.svg"

    public = (await client.get("/api/v1/settings", params={"locale": "kk"})).json()
    assert public["site_name"] == "MegaSmart холдингі"
    assert [n["page_slug"] for n in public["navigation"]] == ["home", "projects", None]
    assert [s["type"] for s in public["socials"]] == ["instagram", "telegram"]
    assert public["logo"]["id"] == str(logo.id)

    # Stored without keys for empty values, like the seeds.
    await session.refresh(site)
    assert site.navigation[1] == {"label": {"ru": "Проекты"}, "page_slug": "projects"}

    stale = await client.put(SETTINGS, headers=h, json=body)
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"


async def test_menu_items_must_lead_somewhere(
    client: AsyncClient, admin: AdminUser, site: SiteSettings
) -> None:
    h = auth_header(admin)
    body = await editable(client, h)
    body["navigation"] = [
        {"label": {"ru": "Нет такой"}, "page_slug": "no-such-page"},
        {"label": {"ru": "Пусто"}},
        {"label": {"ru": "И то и то"}, "page_slug": "home", "url": "https://example.com"},
        {"label": {"ru": "Не ссылка"}, "url": "javascript:alert(1)"},
        {"label": {"ru": "Плохой якорь"}, "anchor": "Контакты"},
        {"label": {"ru": "Не адрес"}, "page_slug": "https://example.com"},
        {"label": {"ru": ""}, "page_slug": "home"},
        {"label": {"ru": "Норм"}, "page_slug": "home", "anchor": "contacts"},
    ]
    res = await client.put(SETTINGS, headers=h, json=body)
    assert res.status_code == 422
    assert error_locs(res.json()) == {
        ("body", "navigation", 0, "page_slug"),
        ("body", "navigation", 1),
        ("body", "navigation", 2, "url"),
        ("body", "navigation", 3, "url"),
        ("body", "navigation", 4, "anchor"),
        ("body", "navigation", 5, "page_slug"),
        ("body", "navigation", 6, "label", "ru"),
    }
    assert (await client.get(SETTINGS, headers=h)).json()["version"] == 1


async def test_socials_texts_and_references_are_checked(
    client: AsyncClient, admin: AdminUser, session: AsyncSession, site: SiteSettings
) -> None:
    h = auth_header(admin)
    pending = await ready_media(session, status="pending")
    body = await editable(client, h)
    body["socials"] = [
        {"type": "myspace", "url": "https://myspace.com/"},
        {"type": "telegram", "url": "t.me/megasmart"},
    ]
    body["footer"]["legal"] = {"ru": "  "}
    body["default_seo"]["og_image_id"] = str(pending.id)
    res = await client.put(SETTINGS, headers=h, json=body)
    assert error_locs(res.json()) == {
        ("body", "socials", 0, "type"),
        ("body", "socials", 1, "url"),
        ("body", "footer", "legal", "ru"),
        ("body", "default_seo", "og_image_id"),
    }


async def test_put_replaces_the_whole_document(
    client: AsyncClient, admin: AdminUser, session: AsyncSession, site: SiteSettings
) -> None:
    h = auth_header(admin)
    logo = await ready_media(session, "logo.svg")
    site.logo_id = logo.id
    await session.commit()

    body = await editable(client, h)
    body.pop("logo_id")  # left out → cleared, not kept
    body["contacts"].pop("phones")
    res = await client.put(SETTINGS, headers=h, json=body)
    assert res.status_code == 200, res.text
    assert res.json()["logo_id"] is None
    assert res.json()["contacts"]["phones"] == []


async def test_settings_are_for_admins_only(
    client: AsyncClient, editor: AdminUser, site: SiteSettings
) -> None:
    res = await client.get(SETTINGS, headers=auth_header(editor))
    assert res.status_code == 403


async def test_missing_settings_row(client: AsyncClient, admin: AdminUser) -> None:
    res = await client.get(SETTINGS, headers=auth_header(admin))
    assert res.status_code == 404


async def test_audit_keeps_before_and_after(
    client: AsyncClient, admin: AdminUser, site: SiteSettings
) -> None:
    h = auth_header(admin)
    body = await editable(client, h)
    original = copy.deepcopy(body["footer"])
    body["footer"]["text"] = {"ru": "Новый подвал"}
    assert (await client.put(SETTINGS, headers=h, json=body)).status_code == 200

    log = (
        await client.get(
            "/api/v1/admin/audit-log", headers=h, params={"entity_type": "site_settings"}
        )
    ).json()["items"]
    before, after = log[0]["changes"]["footer"]
    assert before["text"] == {"ru": "Холдинг"} and original["text"]["ru"] == "Холдинг"
    assert after["text"] == {"ru": "Новый подвал"}
