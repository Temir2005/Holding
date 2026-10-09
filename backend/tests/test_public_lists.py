"""Public lists the site filters: projects, people, clients, vacancies.

Only published rows, in the editors' order; filters combine.
"""

from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Client, Division, EmploymentType, Person, Project, ProjectStatus, Vacancy

API = "/api/v1"
FULL = EmploymentType.full_time


@pytest.fixture
async def content(session: AsyncSession) -> None:
    dev = Division(slug="development", name={"ru": "Девелопмент"}, sort_order=0)
    panels = Division(slug="smart-panels", name={"ru": "Панели"}, sort_order=10)
    session.add_all([dev, panels])
    await session.flush()
    session.add_all(
        [
            Project(slug="b", title={"ru": "Б"}, division_id=dev.id, status=ProjectStatus.completed, is_featured=True, sort_order=20),  # noqa: E501
            Project(slug="a", title={"ru": "А"}, division_id=dev.id, status=ProjectStatus.in_progress, sort_order=10),  # noqa: E501
            Project(slug="c", title={"ru": "В"}, division_id=panels.id, status=ProjectStatus.completed, is_featured=True, sort_order=0),  # noqa: E501
            Project(slug="hidden", title={"ru": "Скрыт"}, division_id=dev.id, status=ProjectStatus.completed, is_featured=True, is_published=False),  # noqa: E501
            Person(full_name={"ru": "Ключевой"}, division_id=dev.id, is_key=True, sort_order=10),
            Person(full_name={"ru": "Инженер"}, division_id=panels.id, sort_order=0),
            Person(full_name={"ru": "Скрытый"}, division_id=dev.id, is_key=True, is_published=False),  # noqa: E501
            Client(name={"ru": "Второй"}, industry="retail", industry_label={"ru": "Ритейл"}, sort_order=10),  # noqa: E501
            Client(
                name={"ru": "Первый", "en": "First"}, industry="furniture",
                industry_label={"ru": "Мебель"}, sort_order=0,
                testimonial={"quote": {"ru": "Отлично"}, "author": {"ru": "Директор"}},
            ),
            Client(name={"ru": "Скрытый"}, industry="retail", industry_label={"ru": "Ритейл"}, is_published=False),  # noqa: E501
            Vacancy(employment_type=FULL, title={"ru": "Открытая"}, division_id=dev.id),
            Vacancy(employment_type=FULL, title={"ru": "Закрытая"}, is_open=False, sort_order=10),
            Vacancy(employment_type=FULL, title={"ru": "Скрытая"}, is_published=False),
        ]
    )  # fmt: skip
    await session.commit()


async def slugs(client: AsyncClient, **params: Any) -> list[str]:
    res = await client.get(f"{API}/projects", params=params)
    assert res.status_code == 200, res.text
    return [p["slug"] for p in res.json()]


@pytest.mark.usefixtures("content")
async def test_projects_filters(client: AsyncClient) -> None:
    assert await slugs(client) == ["c", "a", "b"]  # editors' order, unpublished excluded
    assert await slugs(client, division="development") == ["a", "b"]
    assert await slugs(client, status="completed") == ["c", "b"]
    assert await slugs(client, featured="true") == ["c", "b"]
    assert await slugs(client, featured="false") == ["a"]
    assert await slugs(client, division="development", status="completed", featured="true") == ["b"]
    assert await slugs(client, division="no-such") == []
    assert (await client.get(f"{API}/projects", params={"status": "lost"})).status_code == 422
    assert (await client.get(f"{API}/projects/hidden")).status_code == 404


@pytest.mark.usefixtures("content")
async def test_people_filters(client: AsyncClient) -> None:
    async def names(**params: Any) -> list[str]:
        res = await client.get(f"{API}/people", params=params)
        assert res.status_code == 200, res.text
        return [p["full_name"] for p in res.json()]

    assert await names() == ["Инженер", "Ключевой"]
    assert await names(division="development") == ["Ключевой"]
    assert await names(key="true") == ["Ключевой"]
    assert await names(key="false") == ["Инженер"]
    assert await names(division="smart-panels", key="true") == []


@pytest.mark.usefixtures("content")
async def test_clients_published_in_order_and_localized(client: AsyncClient) -> None:
    body = (await client.get(f"{API}/clients", params={"locale": "en"})).json()
    assert [c["name"] for c in body] == ["First", "Второй"]  # en missing → Russian
    assert body[0]["industry"] == "furniture"
    assert body[0]["testimonial"]["quote"] == "Отлично"
    assert body[1]["testimonial"] is None


@pytest.mark.usefixtures("content")
async def test_vacancies_open_and_published_only(client: AsyncClient) -> None:
    body = (await client.get(f"{API}/vacancies")).json()
    assert [v["title"] for v in body] == ["Открытая"]
