from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Lead, Media, Page, Section, TimelineEvent
from tests.conftest import publish


async def _page_with_sections(session: AsyncSession) -> None:
    media = Media(
        s3_key="test/hero.jpg",
        bucket="test",
        mime_type="image/jpeg",
        size_bytes=1,
        width=1600,
        height=900,
        alt={"ru": "Фото"},
    )
    session.add(media)
    session.add_all(
        [
            TimelineEvent(year=2015, title={"ru": "Завод"}, sort_order=1),
            TimelineEvent(year=2004, title={"ru": "Цех", "kk": "Цех (kk)"}, sort_order=0),
            TimelineEvent(year=2010, title={"ru": "Скрыто"}, is_published=False),
        ]
    )
    await session.flush()
    page = Page(slug="home", title={"ru": "Главная"})
    page.sections = [
        Section(
            type="hero",
            sort_order=0,
            data={
                "title": {"ru": "Строим", "en": "We build"},
                "background_media_id": str(media.id),
            },
        ),
        Section(type="timeline", sort_order=1, data={}),
        Section(type="hero", sort_order=2, is_visible=False, data={"title": {"ru": "скрыт"}}),
        Section(type="no_such_type", sort_order=3, data={}),
        Section(type="quote", sort_order=4, data={"text": 123}),  # invalid → skipped
    ]
    session.add(page)
    await session.commit()
    await publish(session, page)


async def test_page_expands_sections(client: AsyncClient, session: AsyncSession) -> None:
    await _page_with_sections(session)
    res = await client.get("/api/v1/pages/home", params={"locale": "en"})
    assert res.status_code == 200
    body = res.json()
    assert [s["type"] for s in body["sections"]] == ["hero", "timeline"]

    hero = body["sections"][0]["data"]
    assert hero["title"] == "We build"
    assert hero["background"]["width"] == 1600
    assert hero["background"]["url"].endswith("/test/test/hero.jpg")

    events = body["sections"][1]["data"]["events"]
    assert [e["year"] for e in events] == [2004, 2015]  # ordered, unpublished excluded
    assert events[0]["title"] == "Цех"  # en missing → ru fallback


async def test_kazakh_locale(client: AsyncClient, session: AsyncSession) -> None:
    await _page_with_sections(session)
    body = (await client.get("/api/v1/pages/home", params={"locale": "kk"})).json()
    assert body["sections"][1]["data"]["events"][0]["title"] == "Цех (kk)"


async def test_unknown_page_is_404(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/pages/missing")).status_code == 404


async def test_unknown_locale_is_rejected(client: AsyncClient) -> None:
    assert (await client.get("/api/v1/pages/home", params={"locale": "de"})).status_code == 422


async def test_lead_is_saved(client: AsyncClient, session: AsyncSession) -> None:
    res = await client.post(
        "/api/v1/leads",
        json={
            "name": "Иван",
            "phone": "+7 777 000 00 00",
            "type": "investor",
            "source_page": "/ru",
        },
    )
    assert res.status_code == 201
    assert await session.scalar(select(func.count()).select_from(Lead)) == 1


async def test_lead_needs_phone_or_email(client: AsyncClient) -> None:
    res = await client.post("/api/v1/leads", json={"name": "Иван", "type": "client"})
    assert res.status_code == 422


async def test_honeypot_lead_is_not_saved(client: AsyncClient, session: AsyncSession) -> None:
    res = await client.post(
        "/api/v1/leads",
        json={
            "name": "Bot",
            "email": "bot@example.com",
            "type": "client",
            "website": "http://spam",
        },
    )
    assert res.status_code == 201
    assert await session.scalar(select(func.count()).select_from(Lead)) == 0
