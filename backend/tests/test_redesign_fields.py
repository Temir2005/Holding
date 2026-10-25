"""Fields added for the redesign: hero stats, stats and showcase layouts, header button,
media focal point. Each one is additive: older documents and responses keep working."""

import uuid
from typing import Any

import pytest
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, Page, Section, SiteSettings, Stat
from app.schemas.admin.media import MediaForm, MediaUpdate
from app.schemas.sections import HeroData, ProductionData, ProjectsShowcaseData, StatsData
from app.schemas.site import SiteSettingsDoc
from tests.conftest import auth_header, publish
from tests.test_pages_admin import make_page, ready_media

ADMIN = "/api/v1/admin"
SETTINGS = f"{ADMIN}/settings"

SITE: dict[str, Any] = {
    "site_name": {"ru": "MegaSmart"},
    "navigation": [{"label": {"ru": "Контакты"}, "anchor": "contacts"}],
    "contacts": {"address": {"ru": "Шымкент"}, "phones": []},
    "socials": [],
    "footer": {"text": {"ru": "Холдинг"}, "legal": {"ru": "© MegaSmart"}},
    "default_seo": {"title": {"ru": "MegaSmart"}, "description": {"ru": "Холдинг"}},
}

# Keys the public API returned before these fields existed; they must all stay.
OLD_HERO_KEYS = {"eyebrow", "title", "subtitle", "background", "video", "ctas", "swatches"}
OLD_STATS_KEYS = {"eyebrow", "title", "stats"}
OLD_SHOWCASE_KEYS = {"eyebrow", "title", "projects", "link"}
OLD_SETTINGS_KEYS = {
    "site_name",
    "logo",
    "navigation",
    "contacts",
    "socials",
    "footer",
    "default_seo",
}
OLD_MEDIA_KEYS = {"id", "url", "width", "height", "alt", "mime_type", "placeholder", "variants"}


# --- defaults ----------------------------------------------------------------------


def test_new_section_fields_have_defaults() -> None:
    assert HeroData.model_validate({}).stat_ids == []
    assert StatsData.model_validate({}).layout == "chain"
    assert ProjectsShowcaseData.model_validate({}).layout == "register"
    assert SiteSettingsDoc.model_validate(SITE).header_cta is None


def test_layouts_accept_only_their_values() -> None:
    assert StatsData.model_validate({"layout": "row"}).layout == "row"
    assert ProjectsShowcaseData.model_validate({"layout": "sheet"}).layout == "sheet"
    with pytest.raises(ValidationError):
        StatsData.model_validate({"layout": "grid"})
    with pytest.raises(ValidationError):
        ProjectsShowcaseData.model_validate({"layout": "chain"})


def test_form_hints_of_new_fields() -> None:
    hero = HeroData.model_json_schema()["properties"]["stat_ids"]
    assert hero["title"] == "Цифры рядом с заголовком"
    assert hero["description"] == "0–4 цифры. Пусто — hero без цифр"
    assert hero["x-ref"] == {"kind": "stat", "many": True}
    stats = StatsData.model_json_schema()["properties"]["layout"]
    assert stats["x-enum-labels"] == {"chain": "Главная цифра и размерная цепочка", "row": "Строка"}
    showcase = ProjectsShowcaseData.model_json_schema()["properties"]["layout"]
    assert showcase["x-enum-labels"] == {"register": "Реестр с превью", "sheet": "Лист проекта"}
    header = SiteSettingsDoc.model_json_schema()["properties"]["header_cta"]
    assert header["title"] == "Кнопка в шапке"
    media = MediaForm.model_json_schema()["properties"]
    assert media["focal_point_x"]["title"] == "Фокус по горизонтали (0–1)"
    assert media["focal_point_y"]["title"] == "Фокус по вертикали (0–1)"
    assert media["focal_point_x"]["description"].startswith("Точка, которая остаётся в кадре")


# --- hero stats, layouts on the public page ----------------------------------------


async def test_home_hero_expands_published_stats(
    client: AsyncClient, session: AsyncSession
) -> None:
    shown = Stat(value=20, suffix={"ru": "+"}, label={"ru": "лет"}, context="home")
    hidden = Stat(value=5, label={"ru": "скрыто"}, context="home", is_published=False)
    second = Stat(value=3, label={"ru": "завода"}, context="home")
    session.add_all([shown, hidden, second])
    await session.flush()
    deleted = uuid.uuid4()
    page = Page(slug="home", title={"ru": "Главная"})
    page.sections = [
        Section(
            type="hero",
            sort_order=0,
            data={
                "title": {"ru": "Строим"},
                "stat_ids": [str(second.id), str(hidden.id), str(deleted), str(shown.id)],
            },
        ),
        Section(type="hero", sort_order=1, data={"title": {"ru": "Без цифр"}}),
        Section(type="stats", sort_order=2, data={"context": "home", "layout": "row"}),
        Section(type="stats", sort_order=3, data={"stat_ids": [str(shown.id)]}),
        Section(type="projects_showcase", sort_order=4, data={"layout": "sheet"}),
        Section(type="projects_showcase", sort_order=5, data={}),
    ]
    session.add(page)
    await session.commit()
    await publish(session, page)

    res = await client.get("/api/v1/pages/home")
    assert res.status_code == 200, res.text
    hero, bare, stats_row, stats_chain, sheet, register = (
        s["data"] for s in res.json()["sections"]
    )
    # Order of the editor kept; unpublished and deleted stats skipped, like the stats block.
    assert [s["label"] for s in hero["stats"]] == ["завода", "лет"]
    assert hero["stats"][1] == {
        "id": str(shown.id),
        "value": 20.0,
        "prefix": None,
        "suffix": "+",
        "label": "лет",
    }
    assert "stat_ids" not in hero
    assert bare["stats"] == []
    assert set(hero) == OLD_HERO_KEYS | {"stats", "overlay", "theme"}

    assert stats_row["layout"] == "row"
    assert stats_chain["layout"] == "chain"
    assert {s["label"] for s in stats_row["stats"]} == {"лет", "завода"}
    assert set(stats_row) == OLD_STATS_KEYS | {"layout"}

    assert (sheet["layout"], register["layout"]) == ("sheet", "register")
    assert set(sheet) == OLD_SHOWCASE_KEYS | {"layout"}


async def test_admin_refuses_missing_hero_stats(client: AsyncClient, editor: AdminUser) -> None:
    h = auth_header(editor)
    page = await make_page(client, h, "about")
    missing = str(uuid.uuid4())
    res = await client.post(
        f"{ADMIN}/pages/{page['id']}/sections",
        headers=h,
        json={"type": "hero", "data": {"stat_ids": [missing]}},
    )
    assert res.status_code == 422, res.text
    locs = {tuple(e["loc"]) for e in res.json()["error"]["details"]}
    assert ("body", "data", "stat_ids", 0) in locs


async def test_public_hero_shows_at_most_four_stats(
    client: AsyncClient, session: AsyncSession
) -> None:
    """Data saved before the limit still renders: the site cuts it, a hidden stat
    does not take a place."""
    hidden = Stat(value=0, label={"ru": "скрыто"}, context="home", is_published=False)
    stats = [Stat(value=i, label={"ru": f"цифра {i}"}, context="home") for i in range(1, 7)]
    session.add_all([hidden, *stats])
    await session.flush()
    page = Page(slug="home", title={"ru": "Главная"})
    page.sections = [
        Section(
            type="hero",
            sort_order=0,
            data={"stat_ids": [str(hidden.id), *(str(s.id) for s in stats)]},
        )
    ]
    session.add(page)
    await session.commit()
    await publish(session, page)

    res = await client.get("/api/v1/pages/home")
    assert res.status_code == 200, res.text
    hero = res.json()["sections"][0]["data"]
    assert [s["label"] for s in hero["stats"]] == ["цифра 1", "цифра 2", "цифра 3", "цифра 4"]


HERO_LIMIT_MSG = "В hero можно выбрать не больше четырёх цифр"


async def test_admin_refuses_more_than_four_hero_stats(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    stats = [Stat(value=i, label={"ru": f"цифра {i}"}, context="home") for i in range(5)]
    session.add_all(stats)
    await session.commit()
    ids = [str(s.id) for s in stats]
    h = auth_header(editor)
    page = await make_page(client, h, "about")
    sections = f"{ADMIN}/pages/{page['id']}/sections"

    too_many = await client.post(
        sections, headers=h, json={"type": "hero", "data": {"stat_ids": ids}}
    )
    assert too_many.status_code == 422, too_many.text
    details = too_many.json()["error"]["details"]
    assert {"loc": ["body", "data", "stat_ids"], "msg": HERO_LIMIT_MSG} in details

    four = await client.post(
        sections, headers=h, json={"type": "hero", "data": {"stat_ids": ids[:4]}}
    )
    assert four.status_code == 201, four.text
    section = four.json()
    res = await client.patch(
        f"{ADMIN}/sections/{section['id']}",
        headers=h,
        json={"version": section["version"], "data": {**section["data"], "stat_ids": ids}},
    )
    assert res.status_code == 422, res.text
    assert {"loc": ["body", "data", "stat_ids"], "msg": HERO_LIMIT_MSG} in res.json()["error"][
        "details"
    ]


# --- production swatches -----------------------------------------------------------


def test_production_swatches_field() -> None:
    assert ProductionData.model_validate({"body": {"ru": "Текст"}}).swatches == []
    prop = ProductionData.model_json_schema()["properties"]["swatches"]
    assert prop["title"] == "Образцы панелей"
    assert prop["description"] == (
        "Условные обозначения материалов: код RAL/LAB, название, цвет, финиш"
    )
    hero = HeroData.model_json_schema()["properties"]["swatches"]
    assert hero["description"].startswith("В новом дизайне не выводится")


async def test_production_swatches_on_the_public_page(
    client: AsyncClient, session: AsyncSession
) -> None:
    swatch = {"code": "RAL 9005", "label": {"ru": "Чёрный мат"}, "color": "#2A2B2D"}
    page = Page(slug="smart-panels", title={"ru": "Панели"})
    page.sections = [
        Section(type="production", sort_order=0, data={"body": {"ru": "Завод"}}),
        Section(
            type="production",
            sort_order=1,
            data={"body": {"ru": "Завод"}, "swatches": [swatch]},
        ),
    ]
    session.add(page)
    await session.commit()
    await publish(session, page)

    res = await client.get("/api/v1/pages/smart-panels")
    assert res.status_code == 200, res.text
    bare, with_swatches = (s["data"] for s in res.json()["sections"])
    assert bare["swatches"] == []
    assert with_swatches["swatches"] == [
        {"code": "RAL 9005", "label": "Чёрный мат", "color": "#2A2B2D", "finish": "matte"}
    ]


# --- header button -----------------------------------------------------------------


@pytest.fixture
async def site(session: AsyncSession) -> SiteSettings:
    session.add(Page(slug="home", title={"ru": "Главная"}, is_published=True))
    row = SiteSettings(**SITE)
    session.add(row)
    await session.commit()
    return row


async def editable(client: AsyncClient, h: dict[str, str]) -> dict[str, Any]:
    read = (await client.get(SETTINGS, headers=h)).json()
    return {k: v for k, v in read.items() if k not in {"id", "refs", "updated_at"}}


async def test_settings_without_header_button(client: AsyncClient, site: SiteSettings) -> None:
    public = (await client.get("/api/v1/settings")).json()
    assert public["header_cta"] is None
    assert set(public) == OLD_SETTINGS_KEYS | {"header_cta"}


async def test_header_button_in_public_settings(
    client: AsyncClient, admin: AdminUser, session: AsyncSession, site: SiteSettings
) -> None:
    h = auth_header(admin)
    body = await editable(client, h)
    assert body["header_cta"] is None
    body["header_cta"] = {"label": {"ru": "Связаться", "en": "Contact"}, "href": "#contacts"}
    res = await client.put(SETTINGS, headers=h, json=body)
    assert res.status_code == 200, res.text
    assert res.json()["header_cta"]["variant"] == "primary"

    public = (await client.get("/api/v1/settings", params={"locale": "en"})).json()
    assert public["header_cta"] == {"label": "Contact", "href": "#contacts", "variant": "primary"}
    kk = (await client.get("/api/v1/settings", params={"locale": "kk"})).json()
    assert kk["header_cta"]["label"] == "Связаться"  # kk missing → ru fallback

    # Removing the button stores NULL again.
    body = await editable(client, h)
    body["header_cta"] = None
    assert (await client.put(SETTINGS, headers=h, json=body)).status_code == 200
    await session.refresh(site)
    assert site.header_cta is None


async def test_header_button_links_are_checked_and_counted(
    client: AsyncClient, admin: AdminUser, site: SiteSettings
) -> None:
    h = auth_header(admin)
    body = await editable(client, h)
    body["header_cta"] = {"label": {"ru": "Проекты"}, "href": "projects"}
    res = await client.put(SETTINGS, headers=h, json=body)
    assert res.status_code == 422, res.text
    assert ("body", "header_cta", "href") in {
        tuple(e["loc"]) for e in res.json()["error"]["details"]
    }

    target = await make_page(client, h, "projects")
    res = await client.put(SETTINGS, headers=h, json=body)
    assert res.status_code == 200, res.text
    deleted = await client.delete(
        f"{ADMIN}/pages/{target['id']}", headers=h, params={"version": target["version"]}
    )
    assert deleted.json()["error"]["code"] == "IN_USE"
    places = {(u["entity_type"], u["field"]) for u in deleted.json()["error"]["details"]}
    assert places == {("site_settings", "header_cta.href")}


# --- media focal point -------------------------------------------------------------


def test_focal_point_validation() -> None:
    assert MediaUpdate.model_validate({"version": 1}).focal_point_x is None
    ok = MediaUpdate.model_validate({"version": 1, "focal_point_x": 0, "focal_point_y": 1})
    assert (ok.focal_point_x, ok.focal_point_y) == (0, 1)
    MediaUpdate.model_validate({"version": 1, "focal_point_x": None, "focal_point_y": None})
    for bad in (
        {"focal_point_x": 0.5},
        {"focal_point_y": 0.5},
        {"focal_point_x": 0.5, "focal_point_y": None},
        {"focal_point_x": 1.5, "focal_point_y": 0.5},
        {"focal_point_x": 0.5, "focal_point_y": -0.1},
    ):
        with pytest.raises(ValidationError):
            MediaUpdate.model_validate({"version": 1, **bad})


async def test_focal_point_edit_and_public_read(
    client: AsyncClient, editor: AdminUser, session: AsyncSession
) -> None:
    h = auth_header(editor)
    media = await ready_media(session)
    url = f"{ADMIN}/media/{media.id}"

    half = await client.patch(url, headers=h, json={"version": 1, "focal_point_x": 0.3})
    assert half.status_code == 422, half.text
    assert "двумя координатами" in half.json()["error"]["details"][0]["msg"]
    outside = await client.patch(
        url, headers=h, json={"version": 1, "focal_point_x": 2, "focal_point_y": 0.5}
    )
    assert outside.status_code == 422
    assert outside.json()["error"]["details"][0]["loc"] == ["body", "focal_point_x"]

    page = Page(slug="home", title={"ru": "Главная"})
    page.sections = [Section(type="hero", data={"background_media_id": str(media.id)})]
    session.add(page)
    await session.commit()
    await publish(session, page)

    background = (await client.get("/api/v1/pages/home")).json()["sections"][0]["data"][
        "background"
    ]
    assert background["focal_point"] is None
    assert set(background) == OLD_MEDIA_KEYS | {"focal_point"}

    res = await client.patch(
        url, headers=h, json={"version": 1, "focal_point_x": 0.25, "focal_point_y": 0.75}
    )
    assert res.status_code == 200, res.text
    assert (res.json()["focal_point_x"], res.json()["focal_point_y"]) == (0.25, 0.75)
    background = (await client.get("/api/v1/pages/home")).json()["sections"][0]["data"][
        "background"
    ]
    assert background["focal_point"] == {"x": 0.25, "y": 0.75}

    # Other edits leave the focal point alone; null for both clears it.
    res = await client.patch(url, headers=h, json={"version": 2, "folder": "projects"})
    assert res.json()["focal_point_x"] == 0.25
    res = await client.patch(
        url, headers=h, json={"version": 3, "focal_point_x": None, "focal_point_y": None}
    )
    assert res.status_code == 200, res.text
    await session.refresh(media)
    assert (media.focal_point_x, media.focal_point_y) == (None, None)


async def test_media_form_offers_focal_point(client: AsyncClient, editor: AdminUser) -> None:
    types = (await client.get(f"{ADMIN}/entity-types", headers=auth_header(editor))).json()
    props = {t["type"]: t for t in types}["media"]["schema"]["properties"]
    x = props["focal_point_x"]
    assert x["title"] == "Фокус по горизонтали (0–1)"
    number = next(o for o in x["anyOf"] if o.get("type") == "number")
    assert (number["minimum"], number["maximum"]) == (0, 1)
