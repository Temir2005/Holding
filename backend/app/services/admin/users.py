import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.errors import AlreadyExists, Conflict
from app.core.security import hash_password
from app.models import AdminUser, UserRole
from app.repositories.admin.users import RefreshTokenRepository, UserRepository
from app.schemas.admin.auth import UserCreate, UserRead, UserUpdate
from app.services.admin.audit import AuditWriter
from app.services.admin.base import Before, CrudService


def to_user_read(user: AdminUser) -> UserRead:
    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        version=user.version,
    )


class UserService(CrudService[AdminUser, UserCreate, UserUpdate, UserRead]):
    """Admin accounts. Accounts are deactivated, never deleted, so the log keeps their names."""

    entity_type = "admin_user"
    entity_label = "Пользователь"

    def __init__(
        self, session: AsyncSession, audit: AuditWriter, *, acting_user: AdminUser | None
    ) -> None:
        self.users = UserRepository(session)
        super().__init__(session, self.users, audit)
        self.acting_user = acting_user

    def build(self, data: UserCreate) -> AdminUser:
        return AdminUser(
            email=data.email,
            full_name=data.full_name.strip(),
            role=data.role,
            password_hash=hash_password(data.password),
            password_changed_at=utcnow(),
            is_active=True,
        )

    async def present_many(self, rows: Sequence[AdminUser]) -> list[UserRead]:
        return [to_user_read(u) for u in rows]

    async def validate(self, obj: AdminUser, before: Before) -> None:
        if await self.users.exists(AdminUser.email == obj.email, AdminUser.id != obj.id):
            raise AlreadyExists(
                f"Пользователь с email {obj.email} уже есть",
                details=[{"loc": ["body", "email"], "msg": "already exists"}],
            )
        loses_admin = obj.role != UserRole.admin or not obj.is_active
        if not loses_admin or obj.id is None:
            return
        if self.acting_user is not None and obj.id == self.acting_user.id:
            raise Conflict(
                "Нельзя отключить себя или снять с себя роль администратора", code="SELF_LOCKOUT"
            )
        if await self.users.count_active_admins(excluding=obj.id) == 0:
            raise Conflict("Должен остаться хотя бы один активный администратор", code="LAST_ADMIN")

    async def on_updated(self, obj: AdminUser, changes: dict[str, Any]) -> None:
        if "is_active" in changes and not obj.is_active:
            # A deactivated account must not keep a working refresh token.
            await RefreshTokenRepository(self.session).revoke_all_for_user(obj.id, utcnow())

    async def set_password(self, user_id: uuid.UUID, new_password: str) -> UserRead:
        """Admin resets someone's password: their sessions and access tokens stop working."""
        user = await self.get_or_404(user_id, lock=True)
        now = utcnow()
        user.password_hash = hash_password(new_password)
        user.password_changed_at = now
        user.version += 1
        await RefreshTokenRepository(self.session).revoke_all_for_user(user.id, now)
        await self.audit.record(
            action="password_reset", entity_type=self.entity_type, entity_id=user.id, changes=None
        )
        await self.session.commit()
        return to_user_read(user)
