"""The data migration that introduced revisions keeps the live site intact.

Rolls the test database back to the revision before page_revision, writes pages the
old way (sections only, raw SQL), migrates forward and checks that published pages
are served from revision 1, built exactly as the app builds snapshots.
"""

import uuid
from collections.abc import AsyncIterator

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings
from app.core.db import get_session
from app.main import app
from app.models import Page, PageRevision, Section
from app.schemas.revisions import PageSnapshot
from app.services.snapshots import build_snapshot
from tests.conftest import run_alembic

BEFORE_REVISIONS = "97d1653f9678"
LIVE = uuid.uuid4()
DRAFT = uuid.uuid4()

OLD_PAGES = """
INSERT INTO page (id, slug, title, seo_title, seo_description, is_published, sort_order)
VALUES
    (:live, 'legacy', '{"ru": "Старая"}', '{"ru": "SEO"}', '{}', true, 0),
    (:draft, 'unfinished', '{"ru": "Недописанная"}', '{}', '{}', false, 10)
"""
OLD_SECTIONS = """
INSERT INTO section (id, page_id, type, sort_order, is_visible, anchor, tone, data)
VALUES
    (gen_random_uuid(), :live, 'hero', 10, true, null, 'dark', '{"title": {"ru": "Второй"}}'),
    (gen_random_uuid(), :live, 'hero', 0, true, 'top', 'light', '{"title": {"ru": "Первый"}}'),
    (gen_random_uuid(), :live, 'hero', 20, false, null, 'dark', '{"title": {"ru": "Скрытый"}}'),
    (gen_random_uuid(), :draft, 'hero', 0, true, null, 'dark', '{"title": {"ru": "Черновик"}}')
"""


async def public_client(factory: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncClient]:
    async def override() -> AsyncIterator[AsyncSession]:
        async with factory() as s:
            yield s

    app.dependency_overrides[get_session] = override
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_session, None)


async def test_published_pages_get_revision_one(engine: AsyncEngine) -> None:
    url = get_settings().test_database_url
    assert url
    # Connections from earlier tests hold prepared statements for the tables the
    # migration recreates: drop them so no test runs on a stale plan.
    await engine.dispose()
    own = create_async_engine(url)
    factory = async_sessionmaker(own, expire_on_commit=False)
    down = run_alembic("downgrade", BEFORE_REVISIONS, database_url=url)
    assert down.returncode == 0, down.stderr
    try:
        async with own.begin() as conn:
            await conn.execute(text(OLD_PAGES), {"live": LIVE, "draft": DRAFT})
            await conn.execute(text(OLD_SECTIONS), {"live": LIVE, "draft": DRAFT})
        await own.dispose()

        up = run_alembic("upgrade", "head", database_url=url)
        assert up.returncode == 0, up.stderr

        async for client in public_client(factory):
            body = (await client.get("/api/v1/pages/legacy")).json()
            assert [s["data"]["title"] for s in body["sections"]] == ["Первый", "Второй"]
            assert body["sections"][0]["anchor"] == "top"
            assert body["seo"]["title"] == "SEO"
            assert (await client.get("/api/v1/pages/unfinished")).status_code == 404

        async with factory() as session:
            revisions = list(await session.scalars(select(PageRevision)))
            assert [(r.page_id, r.number) for r in revisions] == [(LIVE, 1)]
            assert revisions[0].comment == "Перенесено при обновлении"
            page = await session.get(Page, LIVE)
            assert page is not None and page.published_revision_id == revisions[0].id
            assert page.published_at is not None
            # SQL and the app build the same snapshot: the page has no unpublished changes.
            sections = list(await session.scalars(select(Section).where(Section.page_id == LIVE)))
            assert PageSnapshot.model_validate(revisions[0].snapshot) == build_snapshot(
                page, sections
            )
    finally:
        restored = run_alembic("upgrade", "head", database_url=url)
        async with own.begin() as conn:
            ids = {"live": LIVE, "draft": DRAFT}
            await conn.execute(text("DELETE FROM page WHERE id IN (:live, :draft)"), ids)
        await own.dispose()
        assert restored.returncode == 0, restored.stderr
