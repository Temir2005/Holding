from enum import StrEnum

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin


class LeadType(StrEnum):
    investor = "investor"
    partner = "partner"
    candidate = "candidate"
    client = "client"


class Lead(IdMixin, TimestampMixin, Base):
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
