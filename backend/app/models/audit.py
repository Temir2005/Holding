import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin
from app.models.user import AdminUser


class AuditLog(IdMixin, Base):
    """Who changed what and when. Written by services in the same transaction as the change.

    `changes`: for "update" only the changed fields as {field: [before, after]};
    for "create" and "delete" the full row.
    """

    __tablename__ = "audit_log"

    # Null for actions by the system (seed, CLI) or by a since-removed user.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("admin_user.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(32))
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    changes: Mapped[dict[str, Any] | None] = mapped_column(JSONB(none_as_null=True))
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    user: Mapped[AdminUser | None] = relationship(lazy="raise")
