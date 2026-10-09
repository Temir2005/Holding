"""Publishing pages: the site shows a frozen revision, the admin edits the draft.

- publish: the draft (texts, SEO, sections) becomes a new revision the site shows;
- unpublish: the page leaves the site (its revision is kept for republishing);
- discard-draft: the draft goes back to what the site shows;
- restore: an old revision becomes the draft again (and optionally goes live);
- preview: a short-lived link to the draft rendered like the public page.

Every action locks the page row and checks its version, and is written to the log.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.config import Settings
from app.core.errors import Conflict, NotFound, ValidationFailed
from app.core.security import create_preview_token
from app.models import AdminUser, Page, PageRevision, Section
from app.repositories.admin.pages import RevisionRepository, SectionRepository
from app.schemas.admin.audit import AuditActor
from app.schemas.admin.pages import PageAdminRead
from app.schemas.admin.publishing import (
    PageAction,
    PreviewLink,
    PublishRequest,
    RestoreRequest,
    RevisionDetail,
    RevisionRead,
)
from app.schemas.refs import RefKind
from app.schemas.revisions import PageSnapshot
from app.services.admin.audit import AuditWriter
from app.services.admin.base import ensure_version, row
from app.services.admin.pages import HOME_SLUG, PageAdminService
from app.services.admin.refs import RefService
from app.services.admin.sections import SectionAdminService
from app.services.snapshots import build_snapshot, differs, snapshot_hash, snapshot_json
from app.storage.service import Storage

ENTITY = "page"
# Fields of a section a revision restores.
SECTION_FIELDS = ("type", "sort_order", "is_visible", "anchor", "tone", "data")


class PublishingService:
    def __init__(
        self,
        session: AsyncSession,
        audit: AuditWriter,
        storage: Storage,
        settings: Settings,
        *,
        acting_user: AdminUser | None,
    ) -> None:
        self.session = session
        self.audit = audit
        self.settings = settings
        self.acting_user = acting_user
        self.pages = PageAdminService(session, audit, storage)
        self.section_checks = SectionAdminService(session, audit, storage)
        self.sections = SectionRepository(session)
        self.revisions = RevisionRepository(session)
        self.refs = RefService(session, storage)

    # --- actions ---------------------------------------------------------------------

    async def publish(self, page_id: uuid.UUID, data: PublishRequest) -> PageAdminRead:
        async with self.pages.transaction():
            page = await self._locked(page_id, data.version)
            sections = await self.sections.of_page(page.id)
            draft = build_snapshot(page, sections)
            if snapshot_hash(draft) != data.draft_hash:
                raise Conflict(
                    "Страницу изменили после того, как вы её открыли. "
                    "Обновите её, проверьте правки и опубликуйте снова.",
                    code="DRAFT_CHANGED",
                )
            current = await self._current(page)
            if page.is_published and not differs(draft, current):
                raise Conflict("На сайте уже эта версия страницы", code="NO_CHANGES")
            errors = await self._problems(page, sections)
            if errors:
                raise ValidationFailed(
                    "Страницу нельзя опубликовать: исправьте блоки из списка", details=errors
                )
            await self.publish_now(page, data.comment)
            await self.session.commit()
        return await self.pages.read(page_id)

    async def publish_now(self, page: Page, comment: str | None) -> bool:
        """Put the draft on the site, without checks or commit (the caller does both).

        A new revision is written only if the content differs from the current one, so
        republishing a page that was taken down does not duplicate history. Returns
        False when there is nothing to do (already on the site, unchanged).
        """
        sections = await self.sections.of_page(page.id)
        draft = build_snapshot(page, sections)
        current = await self._current(page)
        changed = differs(draft, current)
        if page.is_published and not changed:
            return False
        if changed or current is None:
            current = PageRevision(
                page_id=page.id,
                number=await self.revisions.next_number(page.id),
                snapshot=snapshot_json(draft),
                comment=comment,
                created_by=self.acting_user.id if self.acting_user else None,
            )
            self.revisions.add(current)
            await self.session.flush()
            page.published_revision_id = current.id
        page.is_published = True
        page.published_at = utcnow()
        page.version += 1
        await self.session.flush()
        await self.audit.record(
            action="publish",
            entity_type=ENTITY,
            entity_id=page.id,
            changes={"revision": current.number, "comment": comment},
        )
        return True

    async def unpublish(self, page_id: uuid.UUID, data: PageAction) -> PageAdminRead:
        async with self.pages.transaction():
            page = await self._locked(page_id, data.version)
            if page.slug == HOME_SLUG:
                raise Conflict(
                    "Главную страницу нельзя снять с публикации: сайт останется без главной",
                    code="PROTECTED_PAGE",
                )
            if not page.is_published:
                raise Conflict("Страницы уже нет на сайте", code="NOT_PUBLISHED")
            page.is_published = False
            page.version += 1
            await self.audit.record(
                action="unpublish", entity_type=ENTITY, entity_id=page.id, changes=None
            )
            await self.session.commit()
        return await self.pages.read(page_id)

    async def discard_draft(self, page_id: uuid.UUID, data: PageAction) -> PageAdminRead:
        async with self.pages.transaction():
            page = await self._locked(page_id, data.version)
            current = await self._current(page)
            if current is None:
                raise Conflict(
                    "Страница ещё не публиковалась: черновик не с чем сбросить",
                    code="NOT_PUBLISHED",
                )
            await self._into_draft(page, PageSnapshot.model_validate(current.snapshot))
            page.version += 1
            await self.audit.record(
                action="discard_draft",
                entity_type=ENTITY,
                entity_id=page.id,
                changes={"revision": current.number},
            )
            await self.session.commit()
        return await self.pages.read(page_id)

    async def restore(self, page_id: uuid.UUID, number: int, data: RestoreRequest) -> PageAdminRead:
        async with self.pages.transaction():
            page = await self._locked(page_id, data.version)
            revision = await self.revisions.get(page.id, number)
            if revision is None:
                raise NotFound("Нет такой версии страницы", details={"number": number})
            await self._into_draft(page, PageSnapshot.model_validate(revision.snapshot))
            # Things the old version points at may be gone by now.
            errors = await self._problems(page, await self.sections.of_page(page.id))
            if errors:
                raise ValidationFailed(
                    f"Версию №{number} нельзя восстановить: часть того, на что она ссылается, "
                    "удалена или изменилась",
                    details=errors,
                )
            page.version += 1
            await self.audit.record(
                action="restore",
                entity_type=ENTITY,
                entity_id=page.id,
                changes={"revision": number, "publish": data.publish},
            )
            if data.publish:
                await self.publish_now(page, data.comment or f"Восстановлена версия №{number}")
            await self.session.commit()
        return await self.pages.read(page_id)

    # --- history and preview ---------------------------------------------------------

    async def history(self, page_id: uuid.UUID) -> list[RevisionRead]:
        page = await self.pages.get_or_404(page_id)
        return [
            self._revision_read(rev, user, page)
            for rev, user in await self.revisions.of_page(page.id)
        ]

    async def revision(self, page_id: uuid.UUID, number: int) -> RevisionDetail:
        page = await self.pages.get_or_404(page_id)
        for rev, user in await self.revisions.of_page(page.id):
            if rev.number == number:
                return RevisionDetail(
                    **self._revision_read(rev, user, page).model_dump(), snapshot=rev.snapshot
                )
        raise NotFound("Нет такой версии страницы", details={"number": number})

    async def preview_link(self, page_id: uuid.UUID) -> PreviewLink:
        page = await self.pages.get_or_404(page_id)
        token = create_preview_token(self.settings, page.id)
        return PreviewLink(
            token=token,
            expires_in=self.settings.preview_token_ttl_minutes * 60,
            path=f"/api/v1/preview/pages/{page.slug}?token={token}",
        )

    # --- internals -------------------------------------------------------------------

    async def _locked(self, page_id: uuid.UUID, version: int) -> Page:
        page = await self.pages.get_or_404(page_id, lock=True)
        ensure_version(row(page), version)
        return page

    async def _current(self, page: Page) -> PageRevision | None:
        if page.published_revision_id is None:
            return None
        return await self.session.get(PageRevision, page.published_revision_id)

    async def _problems(self, page: Page, sections: list[Section]) -> list[dict[str, Any]]:
        """Everything that would stop the page from being saved, for all sections at once."""
        errors: list[dict[str, Any]] = []
        if page.og_image_id and not await self.refs.existing(RefKind.media, [page.og_image_id]):
            errors.append({"loc": ["page", "og_image_id"], "msg": "файл не найден"})
        ordered = sorted(sections, key=lambda s: (s.sort_order, str(s.id)))
        for i, section in enumerate(ordered):
            for error in await self.section_checks.problems(section, ("sections", i)):
                errors.append({**error, "section_id": str(section.id)})
        return errors

    async def _into_draft(self, page: Page, snapshot: PageSnapshot) -> None:
        """Make the draft equal to the snapshot; sections keep their ids."""
        og_image = snapshot.page.og_image_id
        if og_image and not await self.refs.existing(RefKind.media, [og_image]):
            raise ValidationFailed(
                "Картинка для соцсетей из этой версии удалена",
                details=[{"loc": ["page", "og_image_id"], "msg": f"файл не найден: {og_image}"}],
            )
        page.title = dict(snapshot.page.title)
        page.seo_title = dict(snapshot.page.seo_title)
        page.seo_description = dict(snapshot.page.seo_description)
        page.og_image_id = og_image

        existing = {s.id: s for s in await self.sections.of_page(page.id)}
        for item in snapshot.sections:
            values = {name: getattr(item, name) for name in SECTION_FIELDS}
            row = existing.pop(item.id, None)
            if row is None:
                self.sections.add(Section(id=item.id, page_id=page.id, **values))
            elif any(getattr(row, k) != v for k, v in values.items()):
                for k, v in values.items():
                    setattr(row, k, v)
                row.version += 1
        for leftover in existing.values():
            await self.sections.delete(leftover)
        await self.session.flush()

    @staticmethod
    def _revision_read(rev: PageRevision, user: AdminUser | None, page: Page) -> RevisionRead:
        return RevisionRead(
            id=rev.id,
            number=rev.number,
            comment=rev.comment,
            created_at=rev.created_at,
            created_by=(
                AuditActor(id=user.id, email=user.email, full_name=user.full_name) if user else None
            ),
            is_current=rev.id == page.published_revision_id,
            sections_count=len(rev.snapshot.get("sections", [])),
        )
