"""Housekeeping run by `python -m app.cli cleanup` (e.g. in Railway's pre-deploy step)."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import RefreshToken
from app.services.admin.audit import NullAuditWriter
from app.services.admin.media import MediaService
from app.storage.service import Storage


@dataclass(frozen=True)
class CleanupReport:
    stale_uploads: int
    refresh_tokens: int


async def purge_refresh_tokens(session: AsyncSession, settings: Settings) -> int:
    """Delete expired tokens, and revoked ones after a retention period.

    Revoked tokens are not deleted at once: while the row exists, a replayed token
    is recognized and its whole session is revoked. After deletion a replay is just
    an unknown token (still rejected, but without revoking the rest of the session).
    """
    now = datetime.now(UTC)
    revoked_before = now - timedelta(days=settings.revoked_token_retention_days)
    result = await session.execute(
        delete(RefreshToken).where(
            or_(RefreshToken.expires_at < now, RefreshToken.revoked_at < revoked_before)
        )
    )
    await session.commit()
    return int(getattr(result, "rowcount", 0) or 0)


async def run_cleanup(session: AsyncSession, storage: Storage, settings: Settings) -> CleanupReport:
    media = MediaService(session, NullAuditWriter(), storage, settings)
    uploads = 0
    while batch := await media.purge_stale(limit=200):
        uploads += batch
    return CleanupReport(
        stale_uploads=uploads, refresh_tokens=await purge_refresh_tokens(session, settings)
    )
