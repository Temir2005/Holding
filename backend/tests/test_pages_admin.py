import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AdminUser,
    Division,
    Media,
    Page,
    Project,
    ProjectStatus,
    Section,
    SiteSettings,
    Stat,
)
from app.schemas.sections import SECTION_SCHEMAS
from tests.conftest import auth_header

PAGES = "/api/v1/admin/pages"
SECTIONS = "/api/v1/admin/sections"


async def ready_media(
    session: AsyncSession, name: str = "photo.jpg", status: str = "ready"
) -> Media:
    media = Media(
        s3_key=f"media/2026/10/{uuid.uuid4()}.jpg",
        bucket="test",
        mime_type="image/jpeg",
        size_bytes=10,
        width=1200,
        height=800,
        status=status,
        original_filename=name,
        variants=[{"width": 480, "height": 320, "key": "media/thumb.webp", "size_bytes": 1}],
    )
    session.add(media)
    await session.commit()
    return media


async def make_page(client: AsyncClient, h: dict[str, str], slug: str = "about") -> dict[str, Any]:
    res = await client.post(PAGES, headers=h, json={"slug": slug, "title": {"ru": "О нас"}})
    assert res.status_code == 201, res.text
    return dict(res.json())


async def add_section(
    client: AsyncClient, h: dict[str, str], page_id: str, body: dict[str, Any]
) -> dict[str, Any]:
    res = await client.post(f"{PAGES}/{page_id}/sections", headers=h, json=body)
    assert res.status_code == 201, res.text
    return dict(res.json())


async def publish_page(
    client: AsyncClient, h: dict[str, str], page_id: str, comment: str | None = None
) -> dict[str, Any]:
    """Publish the draft as the editor sees it now (version and draft hash from GET)."""
    detail = (await client.get(f"{PAGES}/{page_id}", headers=h)).json()
    res = await client.post(
        f"{PAGES}/{page_id}/publish",
        headers=h,
        json={"version": detail["version"], "draft_hash": detail["draft_hash"], "comment": comment},
    )
    assert res.status_code == 200, res.text
    return dict(res.json())


# --- pages -------------------------------------------------------------------------


async def test_page_crud_and_slug_rules(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    assert (page["slug"], page["version"], page["is_published"]) == ("about", 1, False)

    bad = await client.post(PAGES, headers=h, json={"slug": "О нас", "title": {"ru": "x"}})
    assert bad.status_code == 422
    dup = await client.post(PAGES, headers=h, json={"slug": "about", "title": {"ru": "x"}})
    assert dup.json()["error"]["code"] == "ALREADY_EXISTS"

    edited = await client.patch(
        f"{PAGES}/{page['id']}",
        headers=h,
        json={"version": 1, "seo_title": {"ru": "О компании", "en": "About"}},
    )
    assert edited.json()["seo_title"] == {"ru": "О компании", "en": "About"}
    assert edited.json()["version"] == 2

    deleted = await client.delete(f"{PAGES}/{page['id']}", headers=h, params={"version": 2})
    assert deleted.status_code == 204


async def test_home_page_is_protected(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    home = await make_page(client, h, "home")
    rename = await client.patch(
        f"{PAGES}/{home['id']}", headers=h, json={"version": 1, "slug": "start"}
    )
    delete = await client.delete(f"{PAGES}/{home['id']}", headers=h, params={"version": 1})
    assert rename.json()["error"]["code"] == delete.json()["error"]["code"] == "PROTECTED_PAGE"


async def test_home_page_cannot_be_unpublished(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    # A new site may start with an unpublished home page...
    home = await make_page(client, h, "home")
    assert home["is_published"] is False
    published = await publish_page(client, h, home["id"])
    assert published["is_published"] is True
    # ...but once it is live, taking it down would leave the site without "/".
    res = await client.post(
        f"{PAGES}/{home['id']}/unpublish", headers=h, json={"version": published["version"]}
    )
    assert (res.status_code, res.json()["error"]["code"]) == (409, "PROTECTED_PAGE")
    assert (await client.get("/api/v1/pages/home")).status_code == 200
    # Other edits of the home page still work.
    renamed = await client.patch(
        f"{PAGES}/{home['id']}",
        headers=h,
        json={"version": published["version"], "title": {"ru": "Холдинг"}},
    )
    assert renamed.status_code == 200


async def test_other_pages_can_be_unpublished(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h, "team")
    published = await publish_page(client, h, page["id"])
    res = await client.post(
        f"{PAGES}/{page['id']}/unpublish", headers=h, json={"version": published["version"]}
    )
    assert res.json()["is_published"] is False
    assert (await client.get("/api/v1/pages/team")).status_code == 404


async def test_page_linked_from_menu_and_buttons_cannot_disappear(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    target = await make_page(client, h, "projects")
    other = await make_page(client, h, "home")
    await add_section(
        client,
        h,
        other["id"],
        {"type": "cta", "data": {"ctas": [{"label": {"ru": "Проекты"}, "href": "projects"}]}},
    )
    session.add(
        SiteSettings(
            site_name={"ru": "MegaSmart"},
            navigation=[{"label": {"ru": "Проекты"}, "page_slug": "projects"}],
            contacts={"address": {"ru": "Шымкент"}},
            socials=[],
            footer={"text": {"ru": "."}, "legal": {"ru": "."}},
            default_seo={"title": {"ru": "M"}, "description": {"ru": "M"}},
        )
    )
    await session.commit()

    res = await client.delete(f"{PAGES}/{target['id']}", headers=h, params={"version": 1})
    assert res.json()["error"]["code"] == "IN_USE"
    places = {(u["entity_type"], u["field"]) for u in res.json()["error"]["details"]}
    assert places == {("site_settings", "navigation.0"), ("section", "data.ctas.0.href")}

    rename = await client.patch(
        f"{PAGES}/{target['id']}", headers=h, json={"version": 1, "slug": "portfolio"}
    )
    assert rename.json()["error"]["code"] == "IN_USE"


async def test_page_detail_lists_sections_in_order(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    for title in ("Первый", "Второй"):
        await add_section(client, h, page["id"], {"type": "cta", "data": {"title": {"ru": title}}})
    detail = (await client.get(f"{PAGES}/{page['id']}", headers=h)).json()
    assert detail["sections_count"] == 2
    assert [s["data"]["title"]["ru"] for s in detail["sections"]] == ["Первый", "Второй"]
    assert detail["sections"][0]["label"] == "Призыв к действию"


# --- sections ----------------------------------------------------------------------


async def test_invalid_data_points_at_the_field(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    res = await client.post(
        f"{PAGES}/{page['id']}/sections",
        headers=h,
        json={
            "type": "process_steps",
            "data": {"steps": [{"title": {"en": "x"}, "text": {"ru": "y"}}]},
        },
    )
    assert res.status_code == 422
    locs = [e["loc"] for e in res.json()["error"]["details"]]
    assert ["body", "data", "steps", 0, "title", "ru"] in locs

    unknown = await client.post(
        f"{PAGES}/{page['id']}/sections", headers=h, json={"type": "hero", "data": {"oops": 1}}
    )
    assert unknown.json()["error"]["details"][0]["loc"] == ["body", "data", "oops"]

    icon = await client.post(
        f"{PAGES}/{page['id']}/sections",
        headers=h,
        json={
            "type": "capabilities",
            "data": {"items": [{"icon": "rocket", "title": {"ru": "a"}, "text": {"ru": "b"}}]},
        },
    )
    assert icon.json()["error"]["details"][0]["loc"] == ["body", "data", "items", 0, "icon"]


async def test_broken_references_and_links_are_refused(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    pending = await ready_media(session, status="pending")
    missing = uuid.uuid4()
    res = await client.post(
        f"{PAGES}/{page['id']}/sections",
        headers=h,
        json={
            "type": "hero",
            "data": {
                "background_media_id": str(pending.id),
                "ctas": [
                    {"label": {"ru": "ok"}, "href": "#contacts"},
                    {"label": {"ru": "ok"}, "href": "https://smartpanels.kz"},
                    {"label": {"ru": "нет"}, "href": "no-such-page"},
                    {"label": {"ru": "нет"}, "href": "projects/nope"},
                ],
            },
        },
    )
    assert res.status_code == 422
    locs = sorted(tuple(e["loc"]) for e in res.json()["error"]["details"])
    assert locs == sorted(
        [
            ("body", "data", "background_media_id"),
            ("body", "data", "ctas", 2, "href"),
            ("body", "data", "ctas", 3, "href"),
        ]
    )

    steps = await client.post(
        f"{PAGES}/{page['id']}/sections",
        headers=h,
        json={
            "type": "process_steps",
            "data": {
                "steps": [{"title": {"ru": "a"}, "text": {"ru": "b"}, "division_id": str(missing)}]
            },
        },
    )
    assert steps.json()["error"]["details"][0]["loc"] == ["body", "data", "steps", 0, "division_id"]


async def test_section_read_has_reference_cards(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    media = await ready_media(session, "facade.jpg")
    section = await add_section(
        client,
        h,
        page["id"],
        {
            "type": "hero",
            "data": {
                "title": {"ru": "Т", "kk": "Т", "en": "T"},
                "background_media_id": str(media.id),
            },
        },
    )
    assert section["data"]["title"] == {"ru": "Т", "kk": "Т", "en": "T"}
    assert section["data"]["background_media_id"] == str(media.id)
    card = section["refs"]["media"][str(media.id)]
    assert card["title"] == "facade.jpg"
    assert card["thumb_url"].endswith("/test/media/thumb.webp")


async def test_reorder_copy_hide_and_delete(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    a = await add_section(
        client, h, page["id"], {"type": "cta", "data": {"title": {"ru": "A"}}, "anchor": "contacts"}
    )
    b = await add_section(client, h, page["id"], {"type": "cta", "data": {"title": {"ru": "B"}}})
    c = await add_section(
        client, h, page["id"], {"type": "cta", "data": {"title": {"ru": "C"}}, "position": 0}
    )

    def titles(sections: list[dict[str, Any]]) -> list[str]:
        return [s["data"]["title"]["ru"] for s in sections]

    detail = (await client.get(f"{PAGES}/{page['id']}", headers=h)).json()
    assert titles(detail["sections"]) == ["C", "A", "B"]

    ordered = await client.put(
        f"{PAGES}/{page['id']}/sections/order", headers=h, json={"ids": [a["id"], b["id"], c["id"]]}
    )
    assert titles(ordered.json()) == ["A", "B", "C"]
    stale = await client.put(
        f"{PAGES}/{page['id']}/sections/order", headers=h, json={"ids": [a["id"]]}
    )
    assert stale.json()["error"]["code"] == "ORDER_MISMATCH"

    copy = await client.post(f"{SECTIONS}/{a['id']}/duplicate", headers=h)
    assert copy.status_code == 201
    assert copy.json()["anchor"] is None
    detail = (await client.get(f"{PAGES}/{page['id']}", headers=h)).json()
    assert titles(detail["sections"]) == ["A", "A", "B", "C"]

    dup_anchor = await client.patch(
        f"{SECTIONS}/{copy.json()['id']}", headers=h, json={"version": 1, "anchor": "contacts"}
    )
    assert dup_anchor.json()["error"]["code"] == "ALREADY_EXISTS"

    hidden = await client.patch(
        f"{SECTIONS}/{b['id']}", headers=h, json={"version": b["version"], "is_visible": False}
    )
    assert hidden.json()["is_visible"] is False

    gone = await client.delete(f"{SECTIONS}/{c['id']}", headers=h, params={"version": c["version"]})
    assert gone.status_code == 204


async def test_hidden_section_is_not_public(client: AsyncClient, editor: AdminUser) -> None:
    """The site shows the published version: edits and hiding take effect on publishing."""
    h = auth_header(editor)
    page = await make_page(client, h, "home")
    s = await add_section(
        client, h, page["id"], {"type": "cta", "data": {"title": {"ru": "Скрою"}}}
    )
    await publish_page(client, h, page["id"])
    assert len((await client.get("/api/v1/pages/home")).json()["sections"]) == 1
    await client.patch(f"{SECTIONS}/{s['id']}", headers=h, json={"version": 1, "is_visible": False})
    assert len((await client.get("/api/v1/pages/home")).json()["sections"]) == 1
    await publish_page(client, h, page["id"])
    assert (await client.get("/api/v1/pages/home")).json()["sections"] == []


async def test_concurrent_section_edits_conflict(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h)
    s = await add_section(client, h, page["id"], {"type": "cta", "data": {"title": {"ru": "A"}}})
    first = await client.patch(
        f"{SECTIONS}/{s['id']}", headers=h, json={"version": 1, "data": {"title": {"ru": "B"}}}
    )
    second = await client.patch(
        f"{SECTIONS}/{s['id']}", headers=h, json={"version": 1, "data": {"title": {"ru": "C"}}}
    )
    assert first.status_code == 200
    assert second.json()["error"]["code"] == "VERSION_CONFLICT"


# --- schema endpoints ---------------------------------------------------------------


def walk(schema: Any, defs: dict[str, Any]) -> list[dict[str, Any]]:
    """All property schemas in a JSON Schema, following $ref."""
    found: list[dict[str, Any]] = []
    if isinstance(schema, dict):
        if "$ref" in schema:
            found += walk(defs[schema["$ref"].split("/")[-1]], defs)
        for prop in schema.get("properties", {}).values():
            found.append(prop)
            found += walk(prop, defs)
        for key in ("items", "anyOf"):
            value = schema.get(key)
            for sub in value if isinstance(value, list) else [value] if value else []:
                found += walk(sub, defs)
    return found


async def test_section_types_describe_every_block(client: AsyncClient, editor: AdminUser) -> None:
    res = await client.get("/api/v1/admin/section-types", headers=auth_header(editor))
    types = {t["type"]: t for t in res.json()}
    assert set(types) == {t.value for t in SECTION_SCHEMAS}
    for info in types.values():
        assert info["label"] and info["description"]
        props = walk(info["schema"], info["schema"].get("$defs", {}))
        assert all(p.get("title") for p in props), info["type"]

    hero = types["hero"]["schema"]
    assert hero["properties"]["title"]["x-widget"] == "localized-text"
    assert hero["properties"]["background_media_id"]["x-ref"] == {"kind": "media", "many": False}
    cta = hero["$defs"]["Cta"]["properties"]
    assert cta["href"]["x-widget"] == "link"
    assert cta["variant"]["x-enum-labels"] == {"primary": "Основная", "secondary": "Второстепенная"}
    assert types["about_text"]["schema"]["properties"]["body"]["x-widget"] == "markdown"
    timeline = types["timeline"]["schema"]["properties"]["event_ids"]
    assert timeline["x-ref"] == {"kind": "timeline_event", "many": True}
    caps = types["capabilities"]["schema"]["$defs"]["IconItem"]["properties"]["icon"]
    assert caps["x-widget"] == "icon" and "factory" in caps["enum"]


async def test_every_localized_and_ref_field_has_a_hint(
    client: AsyncClient, editor: AdminUser
) -> None:
    for info in (
        await client.get("/api/v1/admin/section-types", headers=auth_header(editor))
    ).json():
        defs = info["schema"].get("$defs", {})
        for prop in walk(info["schema"], defs):
            refs = [prop.get("$ref", "")] + [s.get("$ref", "") for s in prop.get("anyOf", [])]
            items_ref = (prop.get("items") or {}).get("$ref", "")
            if any(r.endswith("/LocalizedText") for r in [*refs, items_ref]):
                assert prop.get("x-widget", "").startswith(("localized", "markdown")), (
                    info["type"],
                    prop,
                )
            if (
                prop.get("format") == "uuid"
                or (prop.get("items") or {}).get("format") == "uuid"
                or any(s.get("format") == "uuid" for s in prop.get("anyOf", []))
            ):
                assert "x-ref" in prop, (info["type"], prop)


async def test_meta_lists_enums_icons_and_locales(client: AsyncClient, editor: AdminUser) -> None:
    meta = (await client.get("/api/v1/admin/meta", headers=auth_header(editor))).json()
    assert [loc["code"] for loc in meta["locales"]] == ["ru", "kk", "en"]
    assert meta["default_locale"] == "ru"
    assert {o["value"] for o in meta["project_statuses"]} == {"completed", "in_progress", "planned"}
    assert "factory" in meta["icons"] and len(meta["icons"]) == 22
    assert meta["media"]["image_mb"] == 20
    assert {o["value"] for o in meta["tones"]} == {"dark", "light", "accent"}


async def test_lookup_finds_entities_for_pickers(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    division = Division(slug="dev", name={"ru": "Development"}, stats=[])
    session.add(division)
    await session.flush()
    for slug, title in (("aaag", "AAAG"), ("birlik", "Birlik")):
        session.add(
            Project(
                slug=slug,
                title={"ru": title},
                status=ProjectStatus.planned,
                tags=[],
                division_id=division.id,
            )
        )
    await session.commit()

    found = (
        await client.get("/api/v1/admin/lookup", headers=h, params={"kind": "project", "q": "birl"})
    ).json()
    assert [c["title"] for c in found] == ["Birlik"]
    pages = (await client.get("/api/v1/admin/lookup", headers=h, params={"kind": "page"})).json()
    assert pages == []
    bad = await client.get("/api/v1/admin/lookup", headers=h, params={"kind": "nope"})
    assert bad.status_code == 422


@pytest.mark.parametrize("path", [PAGES, "/api/v1/admin/section-types", "/api/v1/admin/meta"])
async def test_content_routes_need_a_token(client: AsyncClient, path: str) -> None:
    assert (await client.get(path)).status_code == 401


async def test_seeded_style_pages_round_trip(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    """A page created outside the admin (seed) opens in the admin and saves back unchanged."""
    page = Page(slug="home", title={"ru": "Главная"}, is_published=True)
    page.sections = [Section(type="stats", sort_order=0, data={"context": "home"})]
    # As in the seeds: the stats context of the block has stats.
    session.add_all([page, Stat(value=20, label={"ru": "лет"}, context="home")])
    await session.commit()
    h = auth_header(editor)
    detail = (await client.get(f"{PAGES}/{page.id}", headers=h)).json()
    section = detail["sections"][0]
    saved = await client.patch(
        f"{SECTIONS}/{section['id']}",
        headers=h,
        json={"version": section["version"], "data": section["data"]},
    )
    assert saved.status_code == 200
    assert saved.json()["data"] == section["data"]
