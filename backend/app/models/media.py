import uuid
from enum import StrEnum
from typing import Any

from sqlalchemy import ARRAY, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, LText, TimestampMixin, VersionMixin


class MediaStatus(StrEnum):
    # Upload URL issued, file not confirmed yet. Hidden from the library, purged later.
    pending = "pending"
    ready = "ready"


class Media(IdMixin, TimestampMixin, VersionMixin, Base):
    __tablename__ = "media"
    __table_args__ = (UniqueConstraint("bucket", "s3_key", name="bucket_key"),)

    s3_key: Mapped[str] = mapped_column(String(512))
    bucket: Mapped[str] = mapped_column(String(128))
    mime_type: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int]
    # Required so the frontend can reserve space and avoid layout shift.
    # 0 for PDF and for videos whose size could not be read.
    width: Mapped[int]
    height: Mapped[int]
    alt: Mapped[LText] = mapped_column(default=dict)
    blurhash: Mapped[str | None] = mapped_column(String(64))
    dominant_color: Mapped[str | None] = mapped_column(String(7))

    original_filename: Mapped[str | None] = mapped_column(String(255))
    folder: Mapped[str | None] = mapped_column(String(128), index=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list, server_default="{}")
    status: Mapped[MediaStatus] = mapped_column(
        String(16), default=MediaStatus.ready, server_default=MediaStatus.ready.value, index=True
    )
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("admin_user.id", ondelete="SET NULL")
    )
    # Downscaled WebP copies: [{"width", "height", "key", "size_bytes"}], narrowest first.
    variants: Mapped[list[Any]] = mapped_column(default=list, server_default="[]")
