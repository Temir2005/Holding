"""Read-side data access for public content. Only published rows leave this module."""

import uuid
from collections.abc import Iterable, Sequence
from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Client,
    Division,
    Media,
    Page,
    PageRevision,
    Person,
    Project,
    ProjectMedia,
    ProjectStatus,
    SiteSettings,
    Stat,
    TimelineEvent,
    Vacancy,
)

T = TypeVar("T", Client, Division, Person, Project, Stat, TimelineEvent, Vacancy)


class ContentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- generic -------------------------------------------------------------

    async def published_by_ids(
        self, model: type[T], ids: Iterable[uuid.UUID]
    ) -> dict[uuid.UUID, T]:
        ids = list(ids)
        if not ids:
            return {}
        rows = await self.session.scalars(
            select(model).where(model.id.in_(ids), model.is_published.is_(True))
        )
        return {row.id: row for row in rows}

    async def media_by_ids(self, ids: Iterable[uuid.UUID]) -> dict[uuid.UUID, Media]:
        ids = list(ids)
        if not ids:
            return {}
        rows = await self.session.scalars(select(Media).where(Media.id.in_(ids)))
        return {row.id: row for row in rows}

    async def _ordered_ids(self, model: type[T], *where: Any) -> list[uuid.UUID]:
        stmt = (
            select(model.id)
            .where(model.is_published.is_(True), *where)
            .order_by(model.sort_order, model.id)
        )
        return list(await self.session.scalars(stmt))

    # --- site & pages --------------------------------------------------------

    async def site_settings(self) -> SiteSettings | None:
        result: SiteSettings | None = await self.session.scalar(select(SiteSettings).limit(1))
        return result

    async def published_page(self, slug: str) -> tuple[Page, PageRevision] | None:
        """A page on the site, with the revision the site shows."""
        row = (
            await self.session.execute(
                select(Page, PageRevision)
                .join(PageRevision, PageRevision.id == Page.published_revision_id)
                .where(Page.slug == slug, Page.is_published.is_(True))
            )
        ).first()
        return (row[0], row[1]) if row else None

    async def page_draft(self, page_id: uuid.UUID) -> Page | None:
        """Any page with its draft sections (for preview), published or not."""
        stmt = select(Page).where(Page.id == page_id).options(selectinload(Page.sections))
        page: Page | None = await self.session.scalar(stmt)
        return page

    # --- live queries used by sections -----------------------------------------

    async def stat_ids_for_context(self, context: str) -> list[uuid.UUID]:
        return await self._ordered_ids(Stat, Stat.context == context)

    async def timeline_ids(self) -> list[uuid.UUID]:
        stmt = (
            select(TimelineEvent.id)
            .where(TimelineEvent.is_published.is_(True))
            .order_by(TimelineEvent.year, TimelineEvent.sort_order)
        )
        return list(await self.session.scalars(stmt))

    async def project_ids(
        self,
        *,
        division_slug: str | None = None,
        featured: bool | None = None,
        status: ProjectStatus | None = None,
    ) -> list[uuid.UUID]:
        where: list[Any] = []
        if division_slug:
            where.append(Project.division.has(Division.slug == division_slug))
        if featured is not None:
            where.append(Project.is_featured.is_(featured))
        if status:
            where.append(Project.status == status)
        return await self._ordered_ids(Project, *where)

    async def person_ids(self, mode: str) -> list[uuid.UUID]:
        where: list[Any] = []
        if mode == "founder":
            where.append(Person.is_founder.is_(True))
        elif mode == "key":
            where += [Person.is_key.is_(True), Person.is_founder.is_(False)]
        elif mode == "rest":
            where += [Person.is_key.is_(False), Person.is_founder.is_(False)]
        return await self._ordered_ids(Person, *where)

    async def client_ids(self, *, with_testimonial: bool = False) -> list[uuid.UUID]:
        where = [Client.testimonial.is_not(None)] if with_testimonial else []
        return await self._ordered_ids(Client, *where)

    async def vacancy_ids(self, division_slug: str | None = None) -> list[uuid.UUID]:
        where: list[Any] = [Vacancy.is_open.is_(True)]
        if division_slug:
            where.append(Vacancy.division.has(Division.slug == division_slug))
        return await self._ordered_ids(Vacancy, *where)

    # --- collections for list endpoints -----------------------------------------

    async def projects(
        self,
        *,
        division_slug: str | None,
        status: ProjectStatus | None,
        featured: bool | None,
    ) -> list[Project]:
        ids = await self.project_ids(division_slug=division_slug, status=status, featured=featured)
        by_id = await self.published_by_ids(Project, ids)
        return [by_id[i] for i in ids if i in by_id]

    async def project_by_slug(self, slug: str) -> Project | None:
        stmt = (
            select(Project)
            .where(Project.slug == slug, Project.is_published.is_(True))
            .options(selectinload(Project.gallery).selectinload(ProjectMedia.media))
        )
        project: Project | None = await self.session.scalar(stmt)
        return project

    async def people(self, *, division_slug: str | None, key: bool | None) -> Sequence[Person]:
        stmt = select(Person).where(Person.is_published.is_(True))
        if division_slug:
            stmt = stmt.where(Person.division.has(Division.slug == division_slug))
        if key is not None:
            stmt = stmt.where(Person.is_key.is_(key))
        return (await self.session.scalars(stmt.order_by(Person.sort_order))).all()

    async def clients(self) -> Sequence[Client]:
        stmt = select(Client).where(Client.is_published.is_(True)).order_by(Client.sort_order)
        return (await self.session.scalars(stmt)).all()

    async def vacancies(self) -> Sequence[Vacancy]:
        ids = await self.vacancy_ids()
        by_id = await self.published_by_ids(Vacancy, ids)
        return [by_id[i] for i in ids if i in by_id]
