import uuid
from datetime import datetime
from typing import ClassVar

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, RefreshToken, UserRole
from app.repositories.admin.base import AdminRepository


class UserRepository(AdminRepository[AdminUser]):
    model = AdminUser
    search_columns = (AdminUser.email, AdminUser.full_name)
    sort_columns: ClassVar = {
        "email": AdminUser.email,
        "full_name": AdminUser.full_name,
        "created_at": AdminUser.created_at,
        "last_login_at": AdminUser.last_login_at,
    }
    default_order = (AdminUser.email,)

    async def by_email(self, email: str) -> AdminUser | None:
        user: AdminUser | None = await self.session.scalar(
            select(AdminUser).where(AdminUser.email == email)
        )
        return user

    async def count_active_admins(self, *, excluding: uuid.UUID | None = None) -> int:
        stmt = select(func.count()).where(
            AdminUser.role == UserRole.admin, AdminUser.is_active.is_(True)
        )
        if excluding is not None:
            stmt = stmt.where(AdminUser.id != excluding)
        return await self.session.scalar(stmt) or 0


class RefreshTokenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def by_hash_for_update(self, token_hash: str) -> RefreshToken | None:
        token: RefreshToken | None = await self.session.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash).with_for_update()
        )
        return token

    def add(self, token: RefreshToken) -> None:
        self.session.add(token)

    async def revoke_family(self, family_id: uuid.UUID, at: datetime) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=at)
        )

    async def revoke_all_for_user(self, user_id: uuid.UUID, at: datetime) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=at)
        )
