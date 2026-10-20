"""Seeds are a bootstrap: they fill an empty database and never touch editors' work."""

from pathlib import Path
from typing import Any

from httpx import AsyncClient
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import AdminUser, AuditLog, Media, PageRevision, Project
from app.storage.memory import InMemoryStorage
from seed import images as img
from seed.run import Outcome, run_seed
from seed.seeder import Seeder
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


async def test_demo_photos_replace_drawn_images(
    session: AsyncSession, storage: InMemoryStorage, tmp_path: Path
) -> None:
    """`seed/photos/<slot>.jpg` replaces that slot's drawn image; other slots stay drawn."""
    Image.new("RGB", (300, 200), (200, 40, 40)).save(tmp_path / "office.jpg", quality=85)
    # Saved as PNG under a .jpg name: re-encoded, since the slot is stored as JPEG.
    Image.new("RGB", (120, 160), (40, 40, 200)).save(tmp_path / "site-0.jpg", "PNG")
    for never_replaced in ("person-founder", "client-0"):
        Image.new("RGB", (50, 50)).save(tmp_path / f"{never_replaced}.jpg")
    s = Seeder(session, storage, photos_dir=tmp_path)

    office = await s.media("office", img.office("office"), "Офис")
    site = await s.media("site-0", img.construction("site-0"), "Стройка")
    drawn = await s.media("office-2", img.office("office-2"), "Переговорная")
    founder = await s.media("person-founder", img.portrait("founder"), "Сергей Хегай")
    logo = await s.media("client-0", img.logo_svg("Альфа", "client-0"), "Логотип")
    await session.flush()

    rows = {mid: await session.get(Media, mid) for mid in (office, site, drawn, founder, logo)}
    photo = rows[office]
    assert photo is not None and (photo.width, photo.height) == (300, 200)
    assert storage.objects["seed/office.jpg"][0] == (tmp_path / "office.jpg").read_bytes()
    assert photo.dominant_color is not None
    red = tuple(int(photo.dominant_color[i : i + 2], 16) for i in (1, 3, 5))
    assert all(abs(c - e) <= 4 for c, e in zip(red, (200, 40, 40), strict=True)), red

    converted = rows[site]
    assert converted is not None and (converted.width, converted.height) == (120, 160)
    assert converted.mime_type == "image/jpeg"
    assert storage.objects["seed/site-0.jpg"][0].startswith(b"\xff\xd8")

    for mid, size in ((drawn, (1600, 1000)), (founder, (900, 1100))):
        media = rows[mid]
        assert media is not None and (media.width, media.height) == size
    svg = rows[logo]
    assert svg is not None and svg.mime_type == "image/svg+xml"


async def test_empty_database_in_production_is_seeded(
    client: AsyncClient, session: AsyncSession, storage: InMemoryStorage
) -> None:
    """The bootstrap itself is allowed anywhere: a fresh production database gets content."""
    production = get_settings().model_copy(update={"app_env": "production"})
    result = await run_seed(session, storage, production)
    assert result.outcome == Outcome.seeded
    assert (await client.get("/api/v1/pages/home")).status_code == 200
    assert storage.objects, "images uploaded"


async def test_seed_swatches_live_in_the_production_block(
    client: AsyncClient, session: AsyncSession, storage: InMemoryStorage
) -> None:
    await run_seed(session, storage, get_settings())

    def blocks(page: dict[str, Any], kind: str) -> list[dict[str, Any]]:
        return [s["data"] for s in page["sections"] if s["type"] == kind]

    home = (await client.get("/api/v1/pages/home")).json()
    panels = (await client.get("/api/v1/pages/smart-panels")).json()
    assert [h["swatches"] for h in blocks(home, "hero") + blocks(panels, "hero")] == [[], []]
    (production,) = blocks(panels, "production")
    codes = [s["code"] for s in production["swatches"]]
    assert codes and len(codes) == len(set(codes))
