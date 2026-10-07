"""Audit trail: who changed what, with before/after values.

Services call `AuditWriter.record` inside the same transaction as the change:
the row is added to the session, and the service's commit saves both or neither.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Protocol

from sqlalchemy import func, inspect, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models import AdminUser, AuditLog
from app.schemas.admin.audit import AuditActor, AuditRead
from app.schemas.admin.common import ListParams, Paginated

# Bookkeeping columns that change on every write and carry no meaning in a diff.
IGNORED_FIELDS = frozenset({"updated_at", "created_at", "version"})
# Never copied into the log; replaced with a marker so a change is still visible.
SENSITIVE_FIELDS = frozenset({"password_hash", "token_hash"})
REDACTED = "***"


class AuditWriter(Protocol):
    async def record(
        self,
        *,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID | None,
        changes: dict[str, Any] | None,
    ) -> None: ...


class NullAuditWriter:
    """Records nothing. For code paths that must not write to the log (tests, dry runs)."""

    async def record(
        self,
        *,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID | None,
        changes: dict[str, Any] | None,
    ) -> None:
        return None


def json_safe(value: Any) -> Any:
    if isinstance(value, uuid.UUID | Decimal):
        return str(value)
    if isinstance(value, datetime | date):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, list | tuple):
        return [json_safe(v) for v in value]
    return value


def snapshot(obj: object) -> dict[str, Any]:
    """Column values of an ORM object, JSON-ready."""
    state = inspect(obj)
    if state is None:
        raise TypeError(f"{type(obj).__name__} is not an ORM object")
    return {
        attr.key: REDACTED if attr.key in SENSITIVE_FIELDS else json_safe(getattr(obj, attr.key))
        for attr in state.mapper.column_attrs
    }


def diff(before: dict[str, Any], after: dict[str, Any]) -> dict[str, list[Any]]:
    """{field: [before, after]} for fields that changed."""
    return {
        key: [before.get(key), after.get(key)]
        for key in after
        if key not in IGNORED_FIELDS and before.get(key) != after.get(key)
    }


class DbAuditWriter:
    """Adds an AuditLog row to the caller's session; the caller commits."""

    def __init__(
        self, session: AsyncSession, *, user_id: uuid.UUID | None, ip_hash: str | None = None
    ) -> None:
        self.session = session
        self.user_id = user_id
        self.ip_hash = ip_hash

    async def record(
        self,
        *,
        action: str,
        entity_type: str,
        entity_id: uuid.UUID | None,
        changes: dict[str, Any] | None,
    ) -> None:
        self.session.add(
            AuditLog(
                user_id=self.user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                changes=changes,
                ip_hash=self.ip_hash,
            )
        )


class AuditService:
    """Read side of the log for admins."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list(
        self,
        params: ListParams,
        *,
        entity_type: str | None = None,
        entity_id: uuid.UUID | None = None,
        user_id: uuid.UUID | None = None,
        action: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> Paginated[AuditRead]:
        filters: list[Any] = []
        if entity_type is not None:
            filters.append(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            filters.append(AuditLog.entity_id == entity_id)
        if user_id is not None:
            filters.append(AuditLog.user_id == user_id)
        if action is not None:
            filters.append(AuditLog.action == action)
        if since is not None:
            filters.append(AuditLog.created_at >= since)
        if until is not None:
            filters.append(AuditLog.created_at < until)
        stmt = select(AuditLog).where(*filters)
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = await self.session.scalars(
            stmt.options(joinedload(AuditLog.user))
            .order_by(AuditLog.created_at.desc(), AuditLog.id)
            .offset(params.offset)
            .limit(params.page_size)
        )
        return Paginated[AuditRead](
            items=[_to_read(r) for r in rows],
            total=total,
            page=params.page,
            page_size=params.page_size,
        )


def _to_read(row: AuditLog) -> AuditRead:
    user: AdminUser | None = row.user
    return AuditRead(
        id=row.id,
        action=row.action,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        changes=row.changes,
        user=AuditActor(id=user.id, email=user.email, full_name=user.full_name) if user else None,
        created_at=row.created_at,
    )
