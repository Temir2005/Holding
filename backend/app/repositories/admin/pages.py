import uuid
from collections.abc import Sequence
from typing import ClassVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, Page, PageRevision, Section
from app.repositories.admin.base import AdminRepository


class PageRepository(AdminRepository[Page]):
    model = Page
    search_columns = (Page.slug, Page.title)
    sort_columns: ClassVar = {
        "sort_order": Page.sort_order,
        "slug": Page.slug,
        "updated_at": Page.updated_at,
    }
    default_order = (Page.sort_order, Page.slug)

    async def slugs(self) -> set[str]:
        return set(await self.session.scalars(select(Page.slug)))

    async def drafts(self, page_ids: Sequence[uuid.UUID]) -> dict[uuid.UUID, list[Section]]:
        """Draft sections of several pages in one query."""
        out: dict[uuid.UUID, list[Section]] = {pid: [] for pid in page_ids}
        if page_ids:
            rows = await self.session.scalars(select(Section).where(Section.page_id.in_(page_ids)))
            for section in rows:
                out[section.page_id].append(section)
        return out


class SectionRepository(AdminRepository[Section]):
    model = Section
    default_order = (Section.sort_order, Section.id)

    async def of_page(self, page_id: uuid.UUID) -> list[Section]:
        rows = await self.session.scalars(
            select(Section)
            .where(Section.page_id == page_id)
            .order_by(Section.sort_order, Section.id)
        )
        return list(rows)


class RevisionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def by_ids(self, ids: Sequence[uuid.UUID]) -> dict[uuid.UUID, PageRevision]:
        if not ids:
            return {}
        rows = await self.session.scalars(select(PageRevision).where(PageRevision.id.in_(ids)))
        return {r.id: r for r in rows}

    async def get(self, page_id: uuid.UUID, number: int) -> PageRevision | None:
        found: PageRevision | None = await self.session.scalar(
            select(PageRevision).where(
                PageRevision.page_id == page_id, PageRevision.number == number
            )
        )
        return found

    async def of_page(self, page_id: uuid.UUID) -> list[tuple[PageRevision, AdminUser | None]]:
        """Newest first, with the author."""
        rows = await self.session.execute(
            select(PageRevision, AdminUser)
            .outerjoin(AdminUser, AdminUser.id == PageRevision.created_by)
            .where(PageRevision.page_id == page_id)
            .order_by(PageRevision.number.desc())
        )
        return [(rev, user) for rev, user in rows.all()]

    async def next_number(self, page_id: uuid.UUID) -> int:
        last = await self.session.scalar(
            select(func.max(PageRevision.number)).where(PageRevision.page_id == page_id)
        )
        return (last or 0) + 1

    def add(self, revision: PageRevision) -> None:
        self.session.add(revision)
