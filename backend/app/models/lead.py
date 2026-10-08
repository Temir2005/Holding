from enum import StrEnum

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin, VersionMixin


class LeadType(StrEnum):
    investor = "investor"
    partner = "partner"
    candidate = "candidate"
    client = "client"


class LeadStatus(StrEnum):
    new = "new"
    in_progress = "in_progress"
    done = "done"
    spam = "spam"


class Lead(IdMixin, TimestampMixin, VersionMixin, Base):
    __tablename__ = "lead"

    name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(254))
    message: Mapped[str | None] = mapped_column(Text)
    type: Mapped[LeadType] = mapped_column(String(16), index=True)
    source_page: Mapped[str | None] = mapped_column(String(256))
    locale: Mapped[str | None] = mapped_column(String(8))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    # Handled by managers in the admin; the public form never sets these.
    status: Mapped[LeadStatus] = mapped_column(
        String(16), default=LeadStatus.new, server_default=LeadStatus.new.value, index=True
    )
    manager_note: Mapped[str | None] = mapped_column(Text)
