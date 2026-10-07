"""Sign-in, token refresh with rotation, sign-out, password change."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import Forbidden, RateLimited, Unauthorized, ValidationFailed
from app.core.rate_limit import RateLimiter
from app.core.security import (
    create_access_token,
    hash_ip,
    hash_password,
    new_refresh_token,
    password_needs_rehash,
    sha256,
    verify_password,
)
from app.models import AdminUser, RefreshToken
from app.repositories.admin.users import RefreshTokenRepository, UserRepository
from app.services.admin.audit import DbAuditWriter

BAD_CREDENTIALS = "Неверный email или пароль"


@dataclass(frozen=True)
class Session:
    """What a successful sign-in or refresh hands to the router."""

    user: AdminUser
    access_token: str
    refresh_token: str
    refresh_token_id: uuid.UUID


@dataclass(frozen=True)
class ClientInfo:
    ip: str | None
    user_agent: str | None


def utcnow() -> datetime:
    return datetime.now(UTC)


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings, limiter: RateLimiter) -> None:
        self.session = session
        self.settings = settings
        self.limiter = limiter
        self.users = UserRepository(session)
        self.tokens = RefreshTokenRepository(session)

    async def login(self, email: str, password: str, client: ClientInfo) -> Session:
        # Per IP and email: slows guessing one account without locking out a whole office.
        key = f"{client.ip}:{email}"
        if not self.limiter.allow(key):
            raise RateLimited("Слишком много попыток входа. Подождите минуту и попробуйте снова.")

        user = await self.users.by_email(email)
        if not verify_password(password, user.password_hash if user else None) or user is None:
            raise Unauthorized(BAD_CREDENTIALS, code="BAD_CREDENTIALS")
        if not user.is_active:
            raise Forbidden("Учётная запись отключена", code="USER_INACTIVE")

        self.limiter.reset(key)
        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
        user.last_login_at = utcnow()
        session = await self._issue(user, client, family_id=uuid.uuid4())
        await self._audit(user, client).record(
            action="login", entity_type="admin_user", entity_id=user.id, changes=None
        )
        await self.session.commit()
        return session

    async def refresh(self, raw_token: str | None, client: ClientInfo) -> Session:
        if not raw_token:
            raise Unauthorized("Нужно войти заново", code="NO_REFRESH_TOKEN")
        token = await self.tokens.by_hash_for_update(sha256(raw_token))
        now = utcnow()
        if token is None:
            raise Unauthorized("Нужно войти заново", code="INVALID_REFRESH_TOKEN")
        if token.revoked_at is not None:
            # A rotated-out token came back: it was copied. End every session in its family.
            await self.tokens.revoke_family(token.family_id, now)
            await self.session.commit()
            raise Unauthorized("Сессия отозвана, войдите заново", code="REFRESH_TOKEN_REUSED")
        if token.expires_at <= now:
            raise Unauthorized("Сессия истекла, войдите заново", code="REFRESH_TOKEN_EXPIRED")

        user = await self.users.get(token.user_id)
        if user is None or not user.is_active:
            await self.tokens.revoke_family(token.family_id, now)
            await self.session.commit()
            raise Unauthorized("Нужно войти заново", code="USER_INACTIVE")

        session = await self._issue(user, client, family_id=token.family_id)
        token.revoked_at = now
        token.replaced_by_id = session.refresh_token_id
        await self.session.commit()
        return session

    async def logout(self, raw_token: str | None) -> None:
        """Ends this browser's session (the token's family). Unknown tokens are ignored."""
        if not raw_token:
            return
        token = await self.tokens.by_hash_for_update(sha256(raw_token))
        if token is not None:
            await self.tokens.revoke_family(token.family_id, utcnow())
            await self.session.commit()

    async def change_password(
        self, user: AdminUser, current: str, new: str, client: ClientInfo
    ) -> Session:
        """Changes the password, signs out every other session, keeps this one signed in."""
        if not verify_password(current, user.password_hash):
            raise ValidationFailed(
                "Текущий пароль указан неверно",
                details=[{"loc": ["body", "current_password"], "msg": "wrong password"}],
            )
        if current == new:
            raise ValidationFailed(
                "Новый пароль совпадает с текущим",
                details=[{"loc": ["body", "new_password"], "msg": "same as current"}],
            )
        now = utcnow()
        user.password_hash = hash_password(new)
        user.password_changed_at = now
        user.version += 1
        await self.tokens.revoke_all_for_user(user.id, now)
        session = await self._issue(user, client, family_id=uuid.uuid4())
        await self._audit(user, client).record(
            action="password_change", entity_type="admin_user", entity_id=user.id, changes=None
        )
        await self.session.commit()
        return session

    async def _issue(self, user: AdminUser, client: ClientInfo, *, family_id: uuid.UUID) -> Session:
        raw = new_refresh_token()
        now = utcnow()
        token = RefreshToken(
            user_id=user.id,
            token_hash=sha256(raw),
            family_id=family_id,
            expires_at=now + timedelta(days=self.settings.refresh_token_ttl_days),
            user_agent=(client.user_agent or "")[:512] or None,
            ip_hash=hash_ip(client.ip, self.settings.lead_ip_salt),
            created_at=now,
        )
        self.tokens.add(token)
        await self.session.flush()
        return Session(
            user=user,
            access_token=create_access_token(self.settings, user.id, user.role),
            refresh_token=raw,
            refresh_token_id=token.id,
        )

    def _audit(self, user: AdminUser, client: ClientInfo) -> DbAuditWriter:
        return DbAuditWriter(
            self.session, user_id=user.id, ip_hash=hash_ip(client.ip, self.settings.lead_ip_salt)
        )
