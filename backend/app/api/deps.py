from typing import Annotated

from fastapi import Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.db import get_session
from app.core.errors import Forbidden, Unauthorized
from app.core.i18n import DEFAULT_LOCALE, Locale
from app.core.security import decode_access_token, hash_ip
from app.models import AdminUser, UserRole
from app.repositories.content import ContentRepository
from app.services.admin.audit import DbAuditWriter
from app.services.admin.auth import ClientInfo
from app.services.mappers import Mapper
from app.storage.service import StorageService, get_storage

SessionDep = Annotated[AsyncSession, Depends(get_session)]
StorageDep = Annotated[StorageService, Depends(get_storage)]
LocaleDep = Annotated[Locale, Query(description="Content locale; falls back to ru")]


def locale_param(locale: Locale = DEFAULT_LOCALE) -> Locale:
    return locale


def get_repo(session: SessionDep) -> ContentRepository:
    return ContentRepository(session)


def get_mapper(storage: StorageDep, locale: Annotated[Locale, Depends(locale_param)]) -> Mapper:
    return Mapper(locale, storage)


RepoDep = Annotated[ContentRepository, Depends(get_repo)]
MapperDep = Annotated[Mapper, Depends(get_mapper)]


# --- admin ---------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False, description="Access token from POST /admin/auth/login")
SettingsDep = Annotated[Settings, Depends(get_settings)]


def client_info(request: Request) -> ClientInfo:
    return ClientInfo(
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


ClientDep = Annotated[ClientInfo, Depends(client_info)]


async def get_current_user(
    session: SessionDep,
    settings: SettingsDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> AdminUser:
    """The signed-in user, re-read on every request so role and deactivation apply at once."""
    if credentials is None:
        raise Unauthorized("Нужно войти", code="NOT_AUTHENTICATED")
    claims = decode_access_token(settings, credentials.credentials)
    user = await session.get(AdminUser, claims.user_id)
    if user is None or not user.is_active:
        raise Unauthorized("Нужно войти заново", code="USER_INACTIVE")
    if claims.issued_at < user.password_changed_at.timestamp():
        raise Unauthorized("Пароль изменён, войдите заново", code="TOKEN_REVOKED")
    return user


CurrentUser = Annotated[AdminUser, Depends(get_current_user)]


async def require_editor(user: CurrentUser) -> AdminUser:
    """Content and media: editors and admins."""
    if user.role not in (UserRole.editor, UserRole.admin):
        raise Forbidden("Недостаточно прав")
    return user


async def require_admin(user: CurrentUser) -> AdminUser:
    """Users, site settings, audit log: admins only."""
    if user.role != UserRole.admin:
        raise Forbidden("Это действие доступно только администратору")
    return user


def get_audit(
    session: SessionDep, user: CurrentUser, client: ClientDep, settings: SettingsDep
) -> DbAuditWriter:
    return DbAuditWriter(
        session, user_id=user.id, ip_hash=hash_ip(client.ip, settings.lead_ip_salt)
    )


AuditDep = Annotated[DbAuditWriter, Depends(get_audit)]
