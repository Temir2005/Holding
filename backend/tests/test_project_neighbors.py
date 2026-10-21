"""`prev` / `next` of a project page: editors' order, published only, no wrap-around."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project, ProjectStatus

API = "/api/v1"
DONE = ProjectStatus.completed


@pytest.fixture
async def projects(session: AsyncSession) -> None:
    session.add_all(
        [
            Project(slug="third", title={"ru": "Третий", "en": "Third"}, status=DONE, sort_order=30),  # noqa: E501
            Project(slug="first", title={"ru": "Первый"}, status=DONE, sort_order=0),
            Project(slug="hidden", title={"ru": "Скрыт"}, status=DONE, sort_order=10, is_published=False),  # noqa: E501
            Project(slug="second", title={"ru": "Второй"}, status=DONE, sort_order=20),
        ]
    )  # fmt: skip
    await session.commit()


async def neighbors(client: AsyncClient, slug: str, locale: str = "ru") -> tuple[object, object]:
    res = await client.get(f"{API}/projects/{slug}", params={"locale": locale})
    assert res.status_code == 200, res.text
    body = res.json()
    return body["prev"], body["next"]


@pytest.mark.usefixtures("projects")
async def test_unpublished_project_is_skipped_between_neighbors(client: AsyncClient) -> None:
    assert await neighbors(client, "first") == (None, {"slug": "second", "title": "Второй"})
    assert await neighbors(client, "second") == (
        {"slug": "first", "title": "Первый"},
        {"slug": "third", "title": "Третий"},
    )


@pytest.mark.usefixtures("projects")
async def test_edge_projects_do_not_wrap_around(client: AsyncClient) -> None:
    first_prev, _ = await neighbors(client, "first")
    _, last_next = await neighbors(client, "third")
    assert first_prev is None
    assert last_next is None


@pytest.mark.usefixtures("projects")
async def test_neighbor_titles_are_localized(client: AsyncClient) -> None:
    _, nxt = await neighbors(client, "second", locale="en")
    assert nxt == {"slug": "third", "title": "Third"}
    prev, _ = await neighbors(client, "second", locale="en")
    assert prev == {"slug": "first", "title": "Первый"}  # fallback to ru


async def test_single_project_has_no_neighbors(client: AsyncClient, session: AsyncSession) -> None:
    session.add(Project(slug="only", title={"ru": "Один"}, status=DONE))
    await session.commit()
    assert await neighbors(client, "only") == (None, None)
