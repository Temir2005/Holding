import uuid
from collections.abc import Sequence
from typing import ClassVar

from sqlalchemy import func, select

from app.models import Page, Section
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

    async def section_counts(self, page_ids: Sequence[uuid.UUID]) -> dict[uuid.UUID, int]:
        if not page_ids:
            return {}
        rows = await self.session.execute(
            select(Section.page_id, func.count())
            .where(Section.page_id.in_(page_ids))
            .group_by(Section.page_id)
        )
        return {page_id: count for page_id, count in rows.all()}

    async def slugs(self) -> set[str]:
        return set(await self.session.scalars(select(Page.slug)))


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
