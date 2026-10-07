import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, MetaData, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# A localized text column: JSONB {"ru": ..., "kk": ..., "en": ...}.
LText = dict[str, str]

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    # Fetch server-generated values (created_at, updated_at) with RETURNING on INSERT and
    # UPDATE. Otherwise reading them after a commit triggers a lazy load, which async
    # sessions cannot do.
    __mapper_args__ = {"eager_defaults": True}  # noqa: RUF012
    type_annotation_map = {  # noqa: RUF012
        LText: JSONB,
        dict[str, Any]: JSONB,
        list[Any]: JSONB,
        uuid.UUID: UUID(as_uuid=True),
    }


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PublishableMixin:
    is_published: Mapped[bool] = mapped_column(default=True, index=True)
    sort_order: Mapped[int] = mapped_column(default=0)


class VersionMixin:
    """Optimistic locking: every admin write bumps `version`, a stale one gets 409."""

    version: Mapped[int] = mapped_column(default=1, server_default="1")
