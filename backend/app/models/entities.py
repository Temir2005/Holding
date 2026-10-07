import uuid
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import ARRAY, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, LText, PublishableMixin, TimestampMixin, VersionMixin
from app.models.media import Media


def media_fk() -> Mapped[uuid.UUID | None]:
    return mapped_column(ForeignKey("media.id", ondelete="SET NULL"))


class ProjectStatus(StrEnum):
    completed = "completed"
    in_progress = "in_progress"
    planned = "planned"


class EmploymentType(StrEnum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    internship = "internship"


class Division(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base):
    __tablename__ = "division"

    slug: Mapped[str] = mapped_column(String(128), unique=True)
    name: Mapped[LText]
    tagline: Mapped[LText] = mapped_column(default=dict)
    description: Mapped[LText] = mapped_column(default=dict)
    logo_id: Mapped[uuid.UUID | None] = media_fk()
    cover_id: Mapped[uuid.UUID | None] = media_fk()
    # [{"value": 30000, "suffix": {"ru": "м²"}, "label": {"ru": "..."}}]
    stats: Mapped[list[Any]] = mapped_column(default=list)
    website_url: Mapped[str | None] = mapped_column(String(512))
    page_slug: Mapped[str | None] = mapped_column(String(128))

    logo: Mapped[Media | None] = relationship(foreign_keys=[logo_id], lazy="selectin")
    cover: Mapped[Media | None] = relationship(foreign_keys=[cover_id], lazy="selectin")


class Project(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base):
    __tablename__ = "project"

    slug: Mapped[str] = mapped_column(String(128), unique=True)
    title: Mapped[LText]
    division_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("division.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[ProjectStatus] = mapped_column(String(16), index=True)
    location: Mapped[LText] = mapped_column(default=dict)
    year: Mapped[int | None]
    area_m2: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    short_description: Mapped[LText] = mapped_column(default=dict)
    body: Mapped[LText] = mapped_column(default=dict)  # Markdown
    cover_id: Mapped[uuid.UUID | None] = media_fk()
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(64)), default=list)
    is_featured: Mapped[bool] = mapped_column(default=False, index=True)
    is_tokenized: Mapped[bool] = mapped_column(default=False)

    cover: Mapped[Media | None] = relationship(lazy="selectin")
    division: Mapped[Division | None] = relationship(lazy="selectin")
    gallery: Mapped[list["ProjectMedia"]] = relationship(
        order_by="ProjectMedia.sort_order", cascade="all, delete-orphan", lazy="raise"
    )


class ProjectMedia(Base):
    __tablename__ = "project_media"

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("project.id", ondelete="CASCADE"), primary_key=True
    )
    media_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("media.id", ondelete="CASCADE"), primary_key=True
    )
    sort_order: Mapped[int] = mapped_column(default=0)

    media: Mapped[Media] = relationship(lazy="selectin")


class Person(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base):
    __tablename__ = "person"

    full_name: Mapped[LText]
    position: Mapped[LText] = mapped_column(default=dict)
    division_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("division.id", ondelete="SET NULL"), index=True
    )
    bio: Mapped[LText] = mapped_column(default=dict)
    photo_id: Mapped[uuid.UUID | None] = media_fk()
    linkedin_url: Mapped[str | None] = mapped_column(String(512))
    is_key: Mapped[bool] = mapped_column(default=False)
    is_founder: Mapped[bool] = mapped_column(default=False)

    photo: Mapped[Media | None] = relationship(lazy="selectin")
    division: Mapped[Division | None] = relationship(lazy="selectin")


class Client(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base):
    __tablename__ = "client"

    name: Mapped[LText]
    logo_id: Mapped[uuid.UUID | None] = media_fk()
    industry: Mapped[str] = mapped_column(String(64), index=True)
    industry_label: Mapped[LText] = mapped_column(default=dict)
    description: Mapped[LText] = mapped_column(default=dict)
    # {"quote": {...}, "author": {...}, "position": {...}} or null
    # none_as_null: store SQL NULL rather than JSON 'null', so "IS NULL" filters work.
    testimonial: Mapped[dict[str, Any] | None] = mapped_column(JSONB(none_as_null=True))
    website_url: Mapped[str | None] = mapped_column(String(512))

    logo: Mapped[Media | None] = relationship(lazy="selectin")


class TimelineEvent(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base):
    __tablename__ = "timeline_event"

    year: Mapped[int]
    title: Mapped[LText]
    description: Mapped[LText] = mapped_column(default=dict)
    image_id: Mapped[uuid.UUID | None] = media_fk()

    image: Mapped[Media | None] = relationship(lazy="selectin")


class Stat(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base):
    __tablename__ = "stat"

    value: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    prefix: Mapped[str | None] = mapped_column(String(16))
    suffix: Mapped[LText] = mapped_column(default=dict)
    label: Mapped[LText]
    # Which page or division this figure belongs to, e.g. "home", "smart-panels".
    context: Mapped[str] = mapped_column(String(64), index=True)


class Vacancy(IdMixin, TimestampMixin, VersionMixin, PublishableMixin, Base):
    __tablename__ = "vacancy"

    title: Mapped[LText]
    division_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("division.id", ondelete="SET NULL")
    )
    location: Mapped[LText] = mapped_column(default=dict)
    employment_type: Mapped[EmploymentType] = mapped_column(String(16))
    description: Mapped[LText] = mapped_column(default=dict)
    is_open: Mapped[bool] = mapped_column(default=True)

    division: Mapped[Division | None] = relationship(lazy="selectin")
