"""Audit trail: who changed what, with before/after values.

Services call `AuditWriter.record` inside the same transaction as the change.
Stage 1 ships the interface and helpers; the database-backed writer comes with
the `audit_log` table in stage 2.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Protocol

from sqlalchemy import inspect

# Bookkeeping columns that change on every write and carry no meaning in a diff.
IGNORED_FIELDS = frozenset({"updated_at", "created_at", "version"})


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
    """Records nothing. Placeholder until the audit_log table exists."""

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
    return {attr.key: json_safe(getattr(obj, attr.key)) for attr in state.mapper.column_attrs}


def diff(before: dict[str, Any], after: dict[str, Any]) -> dict[str, list[Any]]:
    """{field: [before, after]} for fields that changed."""
    return {
        key: [before.get(key), after.get(key)]
        for key in after
        if key not in IGNORED_FIELDS and before.get(key) != after.get(key)
    }
