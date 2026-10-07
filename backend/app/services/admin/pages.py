"""Pages: slug, title, SEO, og-image, publication, order; and a page with its sections."""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AlreadyExists, Conflict, InUse, ValidationFailed
from app.models import Media, Page
from app.repositories.admin.pages import PageRepository
from app.schemas.admin.common import ListParams, Paginated
from app.schemas.admin.pages import PageAdminRead, PageCreate, PageDetail, PageUpdate, RefCard
from app.schemas.refs import RefKind
from app.services.admin.audit import AuditWriter
from app.services.admin.base import CrudService
from app.services.admin.refs import RefService
from app.services.admin.sections import SectionAdminService
from app.services.admin.usage import UsageFinder
from app.storage.service import Storage

# The site's root route renders this page; it can be edited but not renamed or deleted.
HOME_SLUG = "home"


class PageAdminService(CrudService[Page, PageCreate, PageUpdate, PageAdminRead]):
    entity_type = "page"
    entity_label = "Страница"

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        self.pages = PageRepository(session)
        super().__init__(session, self.pages, audit)
        self.refs = RefService(session, storage)
        self.storage = storage
        # Filled before to_read() so it can stay synchronous.
        self._counts: dict[uuid.UUID, int] = {}
        self._og_cards: dict[uuid.UUID, RefCard] = {}
        self._original_slug: str | None = None
        self._was_published: bool | None = None

    # --- CrudService hooks ---------------------------------------------------------

    def build(self, data: PageCreate) -> Page:
        return Page(
            slug=data.slug,
            title=data.title.model_dump(exclude_none=True),
            seo_title=data.seo_title.model_dump(exclude_none=True) if data.seo_title else {},
            seo_description=(
                data.seo_description.model_dump(exclude_none=True) if data.seo_description else {}
            ),
            og_image_id=data.og_image_id,
            is_published=data.is_published,
        )

    def apply(self, obj: Page, changes: dict[str, Any]) -> None:
        self._original_slug = obj.slug
        self._was_published = obj.is_published
        for key in ("title", "seo_title", "seo_description"):
            if key in changes:
                # Only languages that have text are stored; the API falls back to Russian.
                changes[key] = {k: v for k, v in (changes[key] or {}).items() if v is not None}
        super().apply(obj, changes)

    def to_read(self, obj: Page) -> PageAdminRead:
        return PageAdminRead(
            id=obj.id,
            slug=obj.slug,
            title=dict(obj.title),
            seo_title=dict(obj.seo_title or {}),
            seo_description=dict(obj.seo_description or {}),
            og_image_id=obj.og_image_id,
            og_image=self._og_cards.get(obj.og_image_id) if obj.og_image_id else None,
            is_published=obj.is_published,
            sort_order=obj.sort_order,
            sections_count=self._counts.get(obj.id, 0),
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            version=obj.version,
        )

    async def validate(self, obj: Page) -> None:
        if await self.pages.exists(Page.slug == obj.slug, Page.id != obj.id):
            raise AlreadyExists(
                f"Страница с адресом «{obj.slug}» уже есть",
                details=[{"loc": ["body", "slug"], "msg": "already exists"}],
            )
        if obj.slug == HOME_SLUG and self._was_published and not obj.is_published:
            raise Conflict(
                "Главную страницу нельзя снять с публикации: сайт останется без главной",
                code="PROTECTED_PAGE",
            )
        renamed_from = self._original_slug
        if renamed_from and renamed_from != obj.slug:
            if renamed_from == HOME_SLUG:
                raise Conflict("Адрес главной страницы менять нельзя", code="PROTECTED_PAGE")
            usages = await UsageFinder(self.session).page(renamed_from)
            if usages:
                raise InUse(
                    "На страницу ссылаются меню, кнопки или направления. "
                    "Сначала поменяйте ссылки, потом адрес.",
                    details=[u.model_dump(mode="json") for u in usages],
                )
        if obj.og_image_id:
            missing = obj.og_image_id not in await self.refs.existing(
                RefKind.media, [obj.og_image_id]
            )
            if missing:
                raise ValidationFailed(
                    "Есть ссылки на несуществующие объекты",
                    details=[
                        {
                            "loc": ["body", "og_image_id"],
                            "msg": f"файл не найден или не загружен до конца: {obj.og_image_id}",
                        }
                    ],
                )

    async def before_delete(self, obj: Page) -> None:
        if obj.slug == HOME_SLUG:
            raise Conflict("Главную страницу удалить нельзя", code="PROTECTED_PAGE")
        usages = await UsageFinder(self.session).page(obj.slug)
        if usages:
            raise InUse(
                "На страницу ссылаются меню, кнопки или направления",
                details=[u.model_dump(mode="json") for u in usages],
            )

    # --- reads with extra data ---------------------------------------------------------

    async def _prefetch(self, pages: list[Page]) -> None:
        self._counts = await self.pages.section_counts([p.id for p in pages])
        image_ids = {p.og_image_id for p in pages if p.og_image_id}
        if image_ids:
            media = await self.session.scalars(select(Media).where(Media.id.in_(image_ids)))
            self._og_cards = {m.id: self.refs.card(RefKind.media, m) for m in media}

    async def list_pages(self, params: ListParams) -> Paginated[PageAdminRead]:
        rows, total = await self.pages.list(params)
        await self._prefetch(list(rows))
        return Paginated[PageAdminRead](
            items=[self.to_read(r) for r in rows],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def detail(self, page_id: uuid.UUID, sections: SectionAdminService) -> PageDetail:
        page = await self.get_or_404(page_id)
        await self._prefetch([page])
        return PageDetail(
            **self.to_read(page).model_dump(), sections=await sections.list_for_page(page.id)
        )

    async def create(self, data: PageCreate) -> PageAdminRead:
        # New pages go to the end of the list.
        last = await self.session.scalar(select(func.max(Page.sort_order)))
        result = await super().create(data)
        page = await self.get_or_404(result.id)
        if last is not None and page.sort_order <= last:
            page.sort_order = last + 10
            await self.session.commit()
        await self._prefetch([page])
        return self.to_read(page)

    async def update(self, id: uuid.UUID, data: PageUpdate) -> PageAdminRead:
        await super().update(id, data)
        page = await self.get_or_404(id)
        await self._prefetch([page])
        return self.to_read(page)
