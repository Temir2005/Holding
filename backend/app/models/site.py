import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, LText, PublishableMixin, TimestampMixin, VersionMixin
from app.models.media import Media


class SiteSettings(IdMixin, TimestampMixin, VersionMixin, Base):
    """Singleton row. JSONB fields are validated by schemas in app.schemas.site."""

    __tablename__ = "site_settings"

    site_name: Mapped[LText]
    logo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media.id", ondelete="SET NULL"))
    navigation: Mapped[list[Any]] = mapped_column(default=list)
    contacts: Mapped[dict[str, Any]] = mapped_column(default=dict)
    socials: Mapped[list[Any]] = mapped_column(default=list)
    footer: Mapped[dict[str, Any]] = mapped_column(default=dict)
    default_seo: Mapped[dict[str, Any]] = mapped_column(default=dict)

    logo: Mapped[Media | None] = relationship(lazy="selectin")


class Page(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base):
    __tablename__ = "page"

    slug: Mapped[str] = mapped_column(String(128), unique=True)
    title: Mapped[LText]
    seo_title: Mapped[LText] = mapped_column(default=dict)
    seo_description: Mapped[LText] = mapped_column(default=dict)
    og_image_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("media.id", ondelete="SET NULL")
    )
    # What the public site shows: the current published revision. Title, SEO and
    # sections above are the draft. `use_alter`: page and page_revision point at each other.
    published_revision_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("page_revision.id", ondelete="SET NULL", use_alter=True)
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    og_image: Mapped[Media | None] = relationship(lazy="selectin")
    sections: Mapped[list["Section"]] = relationship(
        back_populates="page",
        order_by="Section.sort_order",
        cascade="all, delete-orphan",
        lazy="raise",
    )


class Section(IdMixin, TimestampMixin, VersionMixin, Base):
    __tablename__ = "section"

    page_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("page.id", ondelete="CASCADE"), index=True
    )
    # Plain string, not a Postgres enum: adding a section type must not need a migration.
    # Valid values and the shape of `data` are enforced by app.schemas.sections.
    type: Mapped[str] = mapped_column(String(64))
    sort_order: Mapped[int] = mapped_column(default=0)
    is_visible: Mapped[bool] = mapped_column(default=True)
    anchor: Mapped[str | None] = mapped_column(String(64))
    tone: Mapped[str] = mapped_column(String(16), default="dark")
    data: Mapped[dict[str, Any]] = mapped_column(default=dict)

    page: Mapped[Page] = relationship(back_populates="sections")
