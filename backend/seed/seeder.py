"""Idempotent upserts for seed data.

Every row gets a deterministic UUID derived from a readable key ("project:aaag"),
so running the seed again updates rows in place instead of creating duplicates.

Pages are published through the same service the admin uses: the first run creates
revision 1 of each page; a later run adds a revision only if the seeded content changed.
The log records these as written by the system.
"""

import uuid
from typing import Any, TypeVar

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Base, Media, Page, ProjectMedia, Section
from app.schemas.sections import SECTION_SCHEMAS, SectionType
from app.services.admin.audit import DbAuditWriter
from app.services.admin.publishing import PublishingService
from app.storage.service import Storage
from seed.images import Rendered

NAMESPACE = uuid.UUID("8f0b1c52-6a3e-4c1e-9b8e-6d5f2a1c0e77")

M = TypeVar("M", bound=Base)


def uid(key: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, key)


def L(ru: str) -> dict[str, str]:
    """Localized text with only Russian filled; kk/en fall back to it."""
    return {"ru": ru}


class Seeder:
    def __init__(self, session: AsyncSession, storage: Storage) -> None:
        self.session = session
        self.storage = storage
        self.publisher = PublishingService(
            session,
            DbAuditWriter(session, user_id=None),
            storage,
            get_settings(),
            acting_user=None,
        )

    async def upsert(self, model: type[M], key: str, **fields: Any) -> uuid.UUID:
        row_id = uid(key)
        await self.session.merge(model(id=row_id, **fields))
        return row_id

    async def media(self, key: str, image: Rendered, alt: str) -> uuid.UUID:
        ext = "svg" if image.mime_type == "image/svg+xml" else "jpg"
        s3_key = f"seed/{key}.{ext}"
        await self.storage.upload(s3_key, image.body, image.mime_type)
        return await self.upsert(
            Media,
            f"media:{key}",
            s3_key=s3_key,
            bucket=self.storage.bucket,
            mime_type=image.mime_type,
            size_bytes=len(image.body),
            width=image.width,
            height=image.height,
            alt=L(alt),
            dominant_color=image.dominant_color,
        )

    async def gallery(self, project_id: uuid.UUID, media_ids: list[uuid.UUID]) -> None:
        await self.session.execute(
            delete(ProjectMedia).where(ProjectMedia.project_id == project_id)
        )
        for i, media_id in enumerate(media_ids):
            self.session.add(ProjectMedia(project_id=project_id, media_id=media_id, sort_order=i))

    async def page(
        self,
        slug: str,
        *,
        title: str,
        seo_description: str,
        sections: list[dict[str, Any]],
        sort_order: int = 0,
        og_image_id: uuid.UUID | None = None,
    ) -> uuid.UUID:
        page_id = await self.upsert(
            Page,
            f"page:{slug}",
            slug=slug,
            title=L(title),
            seo_title=L(
                f"{title} · MegaSmart" if slug != "home" else "MegaSmart — холдинг полного цикла"
            ),
            seo_description=L(seo_description),
            og_image_id=og_image_id,
            is_published=True,
            sort_order=sort_order,
        )
        keep: list[uuid.UUID] = []
        for i, spec in enumerate(sections):
            spec = dict(spec)
            stype = spec.pop("type")
            anchor = spec.pop("anchor", None)
            tone = spec.pop("tone", "dark")
            # Validate with the same schema the API uses, then store JSON-safe values.
            data = SECTION_SCHEMAS[SectionType(stype)].stored.model_validate(spec)
            section_id = await self.upsert(
                Section,
                f"section:{slug}:{i}",
                page_id=page_id,
                type=stype,
                sort_order=i * 10,
                is_visible=True,
                anchor=anchor,
                tone=tone,
                data=data.model_dump(mode="json"),
            )
            keep.append(section_id)
        # Drop sections that an earlier version of the seed created but this one no longer has.
        await self.session.execute(
            delete(Section).where(Section.page_id == page_id, Section.id.not_in(keep))
        )
        page = await self.session.get(Page, page_id, populate_existing=True)
        assert page is not None
        await self.publisher.publish_now(page, "Начальное наполнение")
        return page_id
