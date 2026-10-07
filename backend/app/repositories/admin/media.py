from collections.abc import Sequence
from datetime import datetime
from typing import ClassVar

from sqlalchemy import func, select

from app.models import Media, MediaStatus
from app.repositories.admin.base import AdminRepository


class MediaRepository(AdminRepository[Media]):
    model = Media
    search_columns = (Media.original_filename, Media.alt, Media.tags)
    sort_columns: ClassVar = {
        "created_at": Media.created_at,
        "original_filename": Media.original_filename,
        "size_bytes": Media.size_bytes,
    }
    default_order = (Media.created_at.desc(), Media.id)

    async def folders(self) -> Sequence[tuple[str | None, int]]:
        rows = await self.session.execute(
            select(Media.folder, func.count())
            .where(Media.status == MediaStatus.ready)
            .group_by(Media.folder)
            .order_by(Media.folder.nulls_first())
        )
        return [(folder, count) for folder, count in rows.all()]

    async def stale_pending(self, older_than: datetime, limit: int) -> Sequence[Media]:
        rows = await self.session.scalars(
            select(Media)
            .where(Media.status == MediaStatus.pending, Media.created_at < older_than)
            .limit(limit)
        )
        return rows.all()
