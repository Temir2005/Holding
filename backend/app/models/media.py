from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, LText, TimestampMixin


class Media(IdMixin, TimestampMixin, Base):
    __tablename__ = "media"
    __table_args__ = (UniqueConstraint("bucket", "s3_key", name="bucket_key"),)

    s3_key: Mapped[str] = mapped_column(String(512))
    bucket: Mapped[str] = mapped_column(String(128))
    mime_type: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int]
    # Required so the frontend can reserve space and avoid layout shift.
    width: Mapped[int]
    height: Mapped[int]
    alt: Mapped[LText] = mapped_column(default=dict)
    blurhash: Mapped[str | None] = mapped_column(String(64))
    dominant_color: Mapped[str | None] = mapped_column(String(7))
