"""Seeds are a bootstrap: they fill an empty database and never touch editors' work."""

from typing import Any

from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import AdminUser, AuditLog, PageRevision, Project
from app.storage.memory import InMemoryStorage
from seed.run import Outcome, run_seed
from tests.conftest import auth_header
from tests.test_pages_admin import PAGES, SECTIONS, publish_page

ADMIN = "/api/v1/admin"


async def find(client: AsyncClient, h: dict[str, str], path: str, q: str) -> dict[str, Any]:
    items = (await client.get(f"{ADMIN}/{path}", headers=h, params={"q": q})).json()["items"]
    assert len(items) == 1, items
    return dict(items[0])


async def count_revisions(session: AsyncSession) -> int:
    return int(await session.scalar(select(func.count()).select_from(PageRevision)) or 0)


async def test_seeds_keep_edits_and_taken_down_pages(
    client: AsyncClient, admin: AdminUser, session: AsyncSession, storage: InMemoryStorage
) -> None:
    settings = get_settings()
    first = await run_seed(session, storage, settings)
    assert first.outcome == Outcome.seeded
    assert (await client.get("/api/v1/pages/team")).status_code == 200
    h = auth_header(admin)

    # An editor's day: rename a project, change a block and publish, take a page down.
    project = await find(client, h, "projects", "aaag")
    renamed = await client.patch(
        f"{ADMIN}/projects/{project['id']}",
        headers=h,
        json={"version": project["version"], "title": {"ru": "AAAG Residence"}},
    )
    assert renamed.status_code == 200, renamed.text
    home = await find(client, h, "pages", "home")
    hero = (await client.get(f"{PAGES}/{home['id']}", headers=h)).json()["sections"][0]
    edited = await client.patch(
        f"{SECTIONS}/{hero['id']}",
        headers=h,
        json={"version": hero["version"], "data": {**hero["data"], "title": {"ru": "Правка"}}},
    )
    assert edited.status_code == 200, edited.text
    await publish_page(client, h, home["id"])
    team = await find(client, h, "pages", "team")
    down = await client.post(
        f"{PAGES}/{team['id']}/unpublish", headers=h, json={"version": team["version"]}
    )
    assert down.status_code == 200, down.text
    revisions = await count_revisions(session)

    # The next deploy runs the seeds again.
    again = await run_seed(session, storage, settings)
    assert again.outcome == Outcome.skipped

    assert (await find(client, h, "projects", "aaag"))["title"]["ru"] == "AAAG Residence"
    public_home = (await client.get("/api/v1/pages/home")).json()
    assert public_home["sections"][0]["data"]["title"] == "Правка"
    assert (await client.get("/api/v1/pages/team")).status_code == 404
    assert await count_revisions(session) == revisions
    seed_runs = await session.scalars(select(AuditLog.changes).where(AuditLog.action == "seed"))
    assert list(seed_runs) == [{"mode": "bootstrap"}]


async def test_force_is_for_dev_only(
    client: AsyncClient, admin: AdminUser, session: AsyncSession, storage: InMemoryStorage
) -> None:
    dev = get_settings().model_copy(update={"app_env": "dev"})
    production = get_settings().model_copy(update={"app_env": "production"})
    await run_seed(session, storage, dev)
    h = auth_header(admin)
    project = await find(client, h, "projects", "aaag")
    await client.patch(
        f"{ADMIN}/projects/{project['id']}",
        headers=h,
        json={"version": project["version"], "title": {"ru": "Правка редактора"}},
    )

    refused = await run_seed(session, storage, production, force=True)
    assert refused.outcome == Outcome.refused
    assert "APP_ENV=dev" in refused.message
    assert (await find(client, h, "projects", "aaag"))["title"]["ru"] == "Правка редактора"

    forced = await run_seed(session, storage, dev, force=True)
    assert forced.outcome == Outcome.seeded
    session.expire_all()
    row = await session.scalar(select(Project).where(Project.slug == "aaag"))
    assert row is not None and row.title["ru"] != "Правка редактора"


async def test_empty_database_in_production_is_seeded(
    client: AsyncClient, session: AsyncSession, storage: InMemoryStorage
) -> None:
    """The bootstrap itself is allowed anywhere: a fresh production database gets content."""
    production = get_settings().model_copy(update={"app_env": "production"})
    result = await run_seed(session, storage, production)
    assert result.outcome == Outcome.seeded
    assert (await client.get("/api/v1/pages/home")).status_code == 200
    assert storage.objects, "images uploaded"
