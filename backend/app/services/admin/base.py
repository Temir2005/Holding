"""Base service for admin CRUD.

Shared here: the version check (optimistic locking), the audit record, reordering,
placing new rows at the end of the list and the transaction boundary. Everything
specific to an entity is written in its own service: how a Create schema becomes a
row (`build`), how rows become read models (`present_many`) and what must hold
before saving (`validate`).

Services keep no per-request state on `self`: what a hook needs is passed to it
(the row as it was before the update, the cards loaded for a batch of rows).
"""

import uuid
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Sequence
from contextlib import asynccontextmanager
from typing import Any, ClassVar, Protocol, cast

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.errors import NotFound, VersionConflict
from app.repositories.admin.base import AdminRepository
from app.schemas.admin.common import ListParams, Paginated, VersionedUpdate
from app.services.admin.audit import AuditWriter, diff, snapshot

# Column values of a row before an update (see audit.snapshot); None when creating.
Before = dict[str, Any] | None


class Versioned(Protocol):
    """What the base service needs from a row: an id and a version counter.

    ORM models get these from IdMixin and VersionMixin. Mypy cannot see through
    SQLAlchemy's `Mapped[...]` descriptors to match the protocol, so the service
    casts once in `row()` instead of sprinkling ignores.
    """

    id: uuid.UUID
    version: int


class Ordered(Protocol):
    sort_order: int


def row(obj: object) -> Versioned:
    return cast(Versioned, obj)


def ensure_version(obj: Versioned, expected: int) -> None:
    """Raise 409 when the client edited an older version than the one stored."""
    if obj.version != expected:
        raise VersionConflict(expected=expected, actual=obj.version)


class CrudService[M: DeclarativeBase, C: BaseModel, U: VersionedUpdate, R: BaseModel](ABC):
    # Name used in the audit log and error messages, e.g. "project".
    entity_type: ClassVar[str]
    # Human name for messages, e.g. "Проект".
    entity_label: ClassVar[str]
    # Rows have `sort_order`, and a new row goes to the end of the list.
    ordered: ClassVar[bool] = False

    def __init__(self, session: AsyncSession, repo: AdminRepository[M], audit: AuditWriter) -> None:
        self.session = session
        self.repo = repo
        self.audit = audit

    # --- entity-specific ------------------------------------------------------

    @abstractmethod
    def build(self, data: C) -> M:
        """Create schema → new ORM row (not yet added to the session)."""

    @abstractmethod
    async def present_many(self, rows: Sequence[M]) -> list[R]:
        """ORM rows → AdminRead schemas.

        Related data (cards of referenced objects, counts) is loaded here once for the
        whole batch and handed to the row mapper as an argument.
        """

    async def present(self, obj: M) -> R:
        return (await self.present_many([obj]))[0]

    def changes(self, data: U) -> dict[str, Any]:
        """What an update writes: by default only the fields the client sent (PATCH)."""
        return data.model_dump(exclude_unset=True, exclude={"version"})

    def apply(self, obj: M, changes: dict[str, Any]) -> None:
        """Copy changed fields onto the row. Override when names or shapes differ."""
        for field, value in changes.items():
            setattr(obj, field, value)

    async def validate(self, obj: M, before: Before) -> None:
        """Checks before saving: unique slug, existing references... Raise AppError.

        `before` holds the column values as they were before this update (None when
        creating), e.g. to see that the slug changed. No checks by default.
        """
        return None

    # --- shared flow ----------------------------------------------------------

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[None]:
        """Roll back on any error, so a failed write leaves nothing half-applied in the
        session (a changed attribute would otherwise be flushed by the next query)."""
        try:
            yield
        except BaseException:
            await self.session.rollback()
            raise

    async def get_or_404(self, id: uuid.UUID, *, lock: bool = False) -> M:
        """Load a row or raise 404. Writers pass `lock=True` so the version check that
        follows cannot race with another transaction."""
        obj = await (self.repo.get_for_update(id) if lock else self.repo.get(id))
        if obj is None:
            raise NotFound(f"{self.entity_label}: запись не найдена", details={"id": str(id)})
        return obj

    async def read(self, id: uuid.UUID) -> R:
        return await self.present(await self.get_or_404(id))

    async def list(self, params: ListParams, *where: Any) -> Paginated[R]:
        rows, total = await self.repo.list(params, *where)
        return Paginated[R](
            items=await self.present_many(rows),
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    async def create(self, data: C) -> R:
        async with self.transaction():
            obj = self.build(data)
            if self.ordered:
                cast(Ordered, obj).sort_order = await self.repo.next_sort_order()
            await self.validate(obj, None)
            self.repo.add(obj)
            await self.session.flush()
            await self.audit.record(
                action="create",
                entity_type=self.entity_type,
                entity_id=row(obj).id,
                changes=snapshot(obj),
            )
            await self.session.commit()
            await self.session.refresh(obj)
            return await self.present(obj)

    async def update(self, id: uuid.UUID, data: U) -> R:
        async with self.transaction():
            obj = await self.get_or_404(id, lock=True)
            ensure_version(row(obj), data.version)
            before = snapshot(obj)
            self.apply(obj, self.changes(data))
            await self.validate(obj, before)
            row(obj).version += 1
            await self.session.flush()
            changes = diff(before, snapshot(obj))
            await self.on_updated(obj, changes)
            await self.audit.record(
                action="update",
                entity_type=self.entity_type,
                entity_id=row(obj).id,
                changes=changes,
            )
            await self.session.commit()
            await self.session.refresh(obj)
            return await self.present(obj)

    async def delete(self, id: uuid.UUID, version: int) -> None:
        async with self.transaction():
            obj = await self.get_or_404(id, lock=True)
            ensure_version(row(obj), version)
            await self.before_delete(obj)
            before = snapshot(obj)
            await self.repo.delete(obj)
            await self.session.flush()
            await self.audit.record(
                action="delete", entity_type=self.entity_type, entity_id=id, changes=before
            )
            await self.session.commit()

    async def on_updated(self, obj: M, changes: dict[str, Any]) -> None:
        """Side effects of an update that must commit with it (e.g. revoke sessions).

        Nothing by default.
        """
        return None

    async def before_delete(self, obj: M) -> None:
        """Refuse deletion of rows still in use (raise InUse with the places).

        Nothing is checked by default; entities with incoming references override this.
        """
        return None

    async def reorder(self, ids: Sequence[uuid.UUID], *scope: Any) -> None:
        async with self.transaction():
            await self.repo.reorder(ids, *scope)
            await self.audit.record(
                action="reorder",
                entity_type=self.entity_type,
                entity_id=None,
                changes={"order": [str(i) for i in ids]},
            )
            await self.session.commit()
