"""Media library.

Upload in three steps:
1. `request_upload` checks the declared type and size, creates a `pending` row and
   returns a presigned PUT URL;
2. the browser PUTs the file straight to S3;
3. `complete` checks the object really exists, its real size and type (by content,
   not by name or header), reads dimensions and the placeholder color, cleans SVG,
   generates WebP variants, and marks the row `ready`.

Pending rows never show in the library and are purged after a while.
"""

import asyncio
import logging
import uuid
from collections.abc import Sequence
from datetime import timedelta
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.config import Settings
from app.core.errors import Conflict, InUse, ValidationFailed
from app.core.i18n import drop_empty_languages
from app.models import AdminUser, Media, MediaStatus
from app.repositories.admin.media import MediaRepository
from app.schemas.admin.common import ListParams, Paginated
from app.schemas.admin.media import (
    CompletedUpload,
    FolderCount,
    MediaAdminRead,
    MediaUpdate,
    MediaUsage,
    UploadRequest,
    UploadTarget,
    UploadTicket,
)
from app.schemas.entities import MediaVariant
from app.services.admin import media_files as files
from app.services.admin.audit import AuditWriter, snapshot
from app.services.admin.base import CrudService
from app.services.admin.usage import UsageFinder
from app.storage.service import Storage

log = logging.getLogger(__name__)

MB = 1024 * 1024
# Each upload-url call also purges this many stale pending uploads.
PURGE_BATCH = 20


class MediaService(CrudService[Media, UploadRequest, MediaUpdate, MediaAdminRead]):
    entity_type = "media"
    entity_label = "Файл"

    def __init__(
        self,
        session: AsyncSession,
        audit: AuditWriter,
        storage: Storage,
        settings: Settings,
        *,
        acting_user: AdminUser | None = None,
    ) -> None:
        self.media = MediaRepository(session)
        super().__init__(session, self.media, audit)
        self.storage = storage
        self.settings = settings
        self.acting_user = acting_user

    # --- CrudService hooks ---------------------------------------------------------

    def build(self, data: UploadRequest) -> Media:
        media_type = files.MEDIA_TYPES[data.content_type]
        now = utcnow()
        file_id = uuid.uuid4()
        return Media(
            id=file_id,
            # Random key: the original name is kept in the row, never in the URL.
            s3_key=f"media/{now:%Y}/{now:%m}/{file_id}.{media_type.ext}",
            bucket=self.storage.bucket,
            mime_type=media_type.mime,
            size_bytes=data.size_bytes,
            width=0,
            height=0,
            alt=drop_empty_languages(data.alt.model_dump()) if data.alt else {},
            original_filename=data.filename,
            folder=data.folder,
            tags=[],
            status=MediaStatus.pending,
            uploaded_by=self.acting_user.id if self.acting_user else None,
            variants=[],
        )

    async def present_many(self, rows: Sequence[Media]) -> list[MediaAdminRead]:
        return [self.to_read(m) for m in rows]

    def to_read(self, obj: Media) -> MediaAdminRead:
        return MediaAdminRead(
            id=obj.id,
            url=self.storage.public_url(obj.s3_key, obj.bucket),
            status=obj.status,
            original_filename=obj.original_filename,
            folder=obj.folder,
            tags=list(obj.tags),
            mime_type=obj.mime_type,
            size_bytes=obj.size_bytes,
            width=obj.width,
            height=obj.height,
            alt=dict(obj.alt),
            dominant_color=obj.dominant_color,
            variants=[
                MediaVariant(
                    width=v["width"],
                    height=v["height"],
                    url=self.storage.public_url(v["key"], obj.bucket),
                )
                for v in obj.variants
            ],
            uploaded_by=obj.uploaded_by,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            version=obj.version,
        )

    def apply(self, obj: Media, changes: dict[str, Any]) -> None:
        if "alt" in changes:
            alt = changes.pop("alt")
            obj.alt = drop_empty_languages(alt or {})
        if "tags" in changes:
            obj.tags = sorted({t.strip() for t in changes.pop("tags") or [] if t.strip()})
        super().apply(obj, changes)

    async def before_delete(self, obj: Media) -> None:
        usages = await UsageFinder(self.session).media(obj.id)
        if usages:
            raise InUse(
                "Файл используется, сначала уберите его из этих мест",
                details=[u.model_dump(mode="json") for u in usages],
            )

    # --- library ---------------------------------------------------------------------

    async def list_ready(
        self, params: ListParams, *, kind: files.MediaKind | None, folder: str | None
    ) -> Paginated[MediaAdminRead]:
        where: list[Any] = [Media.status == MediaStatus.ready]
        if kind is not None:
            where.append(
                Media.mime_type.in_([t.mime for t in files.MEDIA_TYPES.values() if t.kind == kind])
            )
        if folder is not None:
            where.append(Media.folder == folder)
        return await self.list(params, *where)

    async def folders(self) -> list[FolderCount]:
        return [FolderCount(folder=f, count=c) for f, c in await self.media.folders()]

    async def usages(self, media_id: uuid.UUID) -> list[MediaUsage]:
        await self.get_or_404(media_id)
        return await UsageFinder(self.session).media(media_id)

    # --- upload ----------------------------------------------------------------------

    def max_bytes(self, media_type: files.MediaType) -> int:
        if media_type.kind == files.MediaKind.video:
            return self.settings.media_max_video_mb * MB
        return self.settings.media_max_image_mb * MB

    async def request_upload(self, data: UploadRequest) -> UploadTicket:
        media_type = files.MEDIA_TYPES.get(data.content_type)
        if media_type is None:
            raise ValidationFailed(
                "Такой тип файла загружать нельзя",
                code="MEDIA_TYPE_NOT_ALLOWED",
                details=[
                    {
                        "loc": ["body", "content_type"],
                        "msg": f"allowed: {sorted(files.MEDIA_TYPES)}",
                    }
                ],
            )
        limit = self.max_bytes(media_type)
        if data.size_bytes > limit:
            raise ValidationFailed(
                f"Файл больше допустимых {limit // MB} МБ",
                code="MEDIA_TOO_LARGE",
                details=[{"loc": ["body", "size_bytes"], "msg": f"max {limit} bytes"}],
            )
        await self.purge_stale(limit=PURGE_BATCH)

        media = self.build(data)
        self.media.add(media)
        await self.session.flush()
        ttl = self.settings.media_upload_url_ttl_seconds
        url = await self.storage.presigned_put_url(media.s3_key, media.mime_type, expires=ttl)
        await self.session.commit()
        await self.session.refresh(media)
        return UploadTicket(
            media=self.to_read(media),
            upload=UploadTarget(url=url, headers={"Content-Type": media.mime_type}, expires_in=ttl),
        )

    async def complete(self, media_id: uuid.UUID) -> CompletedUpload:
        # 1. Read the row without a lock and end the transaction: the slow part below
        #    (S3 transfers, image processing) must not hold a row lock or a connection.
        media = await self.get_or_404(media_id)
        if media.status != MediaStatus.pending:
            raise Conflict("Загрузка этого файла уже завершена", code="UPLOAD_ALREADY_COMPLETED")
        key = media.s3_key
        media_type = files.MEDIA_TYPES[media.mime_type]
        await self.session.commit()

        # 2. Check and process the file. CPU work runs in a worker thread.
        info = await self.storage.head(key)
        if info is None:
            raise Conflict(
                "Файл ещё не загружен в хранилище. Отправьте его по выданной ссылке и повторите.",
                code="UPLOAD_MISSING",
            )
        limit = self.max_bytes(media_type)
        if info.size > limit:
            await self._discard(media_id, key)
            raise ValidationFailed(
                f"Файл больше допустимых {limit // MB} МБ", code="MEDIA_TOO_LARGE"
            )
        try:
            probe, variants = await self._process(key, media_type, info.size)
        except files.ProbeError as exc:
            await self._discard(media_id, key)
            raise ValidationFailed(str(exc), code="MEDIA_TYPE_MISMATCH") from exc

        size = info.size
        if probe.cleaned is not None:
            # Sanitized SVG or a raster image without metadata replaces the upload.
            await self.storage.upload(key, probe.cleaned, probe.mime)
            size = len(probe.cleaned)
        stored_variants: list[dict[str, Any]] = []
        for v in variants:
            variant_key = key.rsplit(".", 1)[0] + f"_w{v.width}.webp"
            await self.storage.upload(variant_key, v.body, "image/webp")
            stored_variants.append(
                {
                    "width": v.width,
                    "height": v.height,
                    "key": variant_key,
                    "size_bytes": len(v.body),
                }
            )

        # 3. Short transaction: lock, make sure nobody completed it meanwhile, write.
        media = await self.get_or_404(media_id, lock=True)
        if media.status != MediaStatus.pending:
            # A parallel complete won; its objects have the same keys, nothing to undo.
            raise Conflict("Загрузка этого файла уже завершена", code="UPLOAD_ALREADY_COMPLETED")
        media.mime_type = probe.mime
        media.size_bytes = size
        media.width, media.height = probe.width, probe.height
        media.dominant_color = probe.dominant_color
        media.variants = stored_variants
        media.status = MediaStatus.ready
        media.version += 1
        await self.session.flush()
        await self.audit.record(
            action="create",
            entity_type=self.entity_type,
            entity_id=media.id,
            changes=snapshot(media),
        )
        await self.session.commit()
        await self.session.refresh(media)
        return CompletedUpload(media=self.to_read(media), warnings=probe.warnings)

    async def _process(
        self, key: str, media_type: files.MediaType, size: int
    ) -> tuple[files.Probe, list[files.Variant]]:
        """Images and SVG are read whole; video and PDF only from their first bytes."""
        if media_type.kind == files.MediaKind.image:
            data = await self.storage.read(key)
            raster = await asyncio.to_thread(
                files.process_raster, data, media_type, self.settings.media_variant_widths
            )
            return raster.probe, raster.variants
        if media_type.kind == files.MediaKind.svg:
            data = await self.storage.read(key)
            return await asyncio.to_thread(files.probe_svg, data), []
        head = await self.storage.read_range(key, 0, min(size, files.HEAD_BYTES) - 1)
        if media_type.kind == files.MediaKind.video:
            return files.probe_mp4(head), []
        return files.probe_pdf(head), []

    async def _discard(self, media_id: uuid.UUID, key: str) -> None:
        """Drop a failed upload: its object and its row, if the row is still pending."""
        await self.storage.delete(key)
        media = await self.media.get_for_update(media_id)
        if media is not None and media.status == MediaStatus.pending:
            await self.media.delete(media)
        await self.session.commit()

    # --- delete ----------------------------------------------------------------------

    async def delete(self, id: uuid.UUID, version: int) -> None:
        media = await self.get_or_404(id)
        keys = [media.s3_key, *(v["key"] for v in media.variants)]
        await super().delete(id, version)
        # After the commit: a failed S3 call leaves an orphan object, never a broken row.
        try:
            await self.storage.delete(*keys)
        except Exception:
            log.exception("media %s: row deleted, but objects %s were not removed", id, keys)

    # --- housekeeping ----------------------------------------------------------------

    async def purge_stale(self, *, limit: int) -> int:
        """Remove uploads that were never completed. Returns how many were removed."""
        cutoff = utcnow() - timedelta(hours=self.settings.media_pending_ttl_hours)
        stale = await self.media.stale_pending(cutoff, limit)
        for media in stale:
            await self.media.delete(media)
        await self.session.flush()
        keys = [m.s3_key for m in stale]
        if keys:
            await self.session.commit()
            try:
                await self.storage.delete(*keys)
            except Exception:
                log.exception("could not remove stale upload objects %s", keys)
        return len(stale)
