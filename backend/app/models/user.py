import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin, VersionMixin


class UserRole(StrEnum):
    # Everything, including users and site settings.
    admin = "admin"
    # Content and media.
    editor = "editor"


class AdminUser(IdMixin, TimestampMixin, VersionMixin, Base):
    """A person who can sign in to the admin. There is no public registration."""

    __tablename__ = "admin_user"

    # Stored lowercased; uniqueness is case-insensitive in practice.
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[UserRole] = mapped_column(String(16))
    is_active: Mapped[bool] = mapped_column(default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Access tokens issued before this moment are rejected (password change, reset).
    password_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class RefreshToken(IdMixin, Base):
    """One refresh token. Rotation replaces it with a new one in the same family;
    presenting a replaced token again means it leaked, so the whole family is revoked."""

    __tablename__ = "refresh_token"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("admin_user.id", ondelete="CASCADE"), index=True
    )
    # sha256 of the raw token; the raw value only ever lives in the cookie.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    family_id: Mapped[uuid.UUID] = mapped_column(index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    replaced_by_id: Mapped[uuid.UUID | None]
    user_agent: Mapped[str | None] = mapped_column(String(512))
    ip_hash: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
