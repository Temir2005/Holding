"""Pages: slug, title, SEO, og-image, order; and a page with its sections.

Publishing (revisions, preview) is app.services.admin.publishing.
"""

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AlreadyExists, Conflict, InUse, ValidationFailed
from app.core.i18n import drop_empty_languages
from app.models import Page, PageRevision
from app.repositories.admin.pages import PageRepository, RevisionRepository
from app.schemas.admin.pages import PageAdminRead, PageCreate, PageDetail, PageUpdate, RefCard
from app.schemas.refs import RefKind
from app.services.admin.audit import AuditWriter
from app.services.admin.base import Before, CrudService
from app.services.admin.refs import RefService
from app.services.admin.sections import SectionAdminService
from app.services.admin.usage import UsageFinder
from app.services.snapshots import build_snapshot, differs, snapshot_hash
from app.storage.service import Storage

# The site's root route renders this page; it can be edited but not renamed or deleted.
HOME_SLUG = "home"
TEXT_FIELDS = ("title", "seo_title", "seo_description")


class PageAdminService(CrudService[Page, PageCreate, PageUpdate, PageAdminRead]):
    entity_type = "page"
    entity_label = "Страница"
    ordered = True

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        self.pages = PageRepository(session)
        super().__init__(session, self.pages, audit)
        self.refs = RefService(session, storage)
        self.storage = storage

    # --- CrudService hooks ---------------------------------------------------------

    def build(self, data: PageCreate) -> Page:
        texts = data.model_dump(include=set(TEXT_FIELDS))
        return Page(
            slug=data.slug,
            title=drop_empty_languages(texts["title"]),
            seo_title=drop_empty_languages(texts["seo_title"] or {}),
            seo_description=drop_empty_languages(texts["seo_description"] or {}),
            og_image_id=data.og_image_id,
            # A draft until someone publishes it.
            is_published=False,
        )

    def apply(self, obj: Page, changes: dict[str, Any]) -> None:
        for key in TEXT_FIELDS:
            if key in changes:
                changes[key] = drop_empty_languages(changes[key] or {})
        super().apply(obj, changes)

    async def present_many(self, rows: Sequence[Page]) -> list[PageAdminRead]:
        drafts = await self.pages.drafts([p.id for p in rows])
        revisions = await RevisionRepository(self.session).by_ids(
            [p.published_revision_id for p in rows if p.published_revision_id]
        )
        cards = await self.refs.load_cards(
            {RefKind.media: {p.og_image_id for p in rows if p.og_image_id}}
        )
        reads = []
        for p in rows:
            revision = revisions.get(p.published_revision_id) if p.published_revision_id else None
            reads.append(
                self.to_read(
                    p,
                    sections_count=len(drafts[p.id]),
                    og_image=cards.get(RefKind.media, p.og_image_id),
                    revision=revision,
                    changed=differs(build_snapshot(p, drafts[p.id]), revision),
                )
            )
        return reads

    @staticmethod
    def to_read(
        obj: Page,
        *,
        sections_count: int,
        og_image: RefCard | None,
        revision: PageRevision | None,
        changed: bool,
    ) -> PageAdminRead:
        return PageAdminRead(
            id=obj.id,
            slug=obj.slug,
            title=dict(obj.title),
            seo_title=dict(obj.seo_title or {}),
            seo_description=dict(obj.seo_description or {}),
            og_image_id=obj.og_image_id,
            og_image=og_image,
            is_published=obj.is_published,
            published_revision_number=revision.number if revision else None,
            published_at=obj.published_at,
            has_unpublished_changes=changed,
            sort_order=obj.sort_order,
            sections_count=sections_count,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            version=obj.version,
        )

    async def validate(self, obj: Page, before: Before) -> None:
        if await self.pages.exists(Page.slug == obj.slug, Page.id != obj.id):
            raise AlreadyExists(
                f"Страница с адресом «{obj.slug}» уже есть",
                details=[{"loc": ["body", "slug"], "msg": "already exists"}],
            )
        renamed_from = before["slug"] if before else None
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

    # --- page with its sections ----------------------------------------------------------

    async def detail(self, page_id: uuid.UUID, sections: SectionAdminService) -> PageDetail:
        page = await self.get_or_404(page_id)
        drafts = await self.pages.drafts([page.id])
        return PageDetail(
            **(await self.present(page)).model_dump(),
            sections=await sections.present_many(
                sorted(drafts[page.id], key=lambda s: (s.sort_order, str(s.id)))
            ),
            draft_hash=snapshot_hash(build_snapshot(page, drafts[page.id])),
        )
