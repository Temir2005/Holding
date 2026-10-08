"""Base repository for admin collections.

A subclass names its model and declares, in plain sight, which columns are
searchable and sortable. Nothing is discovered by reflection.
"""

import uuid
from collections.abc import Mapping, Sequence
from typing import Any, ClassVar

from sqlalchemy import String, cast, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase, InstrumentedAttribute

from app.core.errors import Conflict, ValidationFailed
from app.schemas.admin.common import ListParams


def like_pattern(text: str) -> str:
    """`%text%` with LIKE wildcards in the user's text escaped."""
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


class AdminRepository[M: DeclarativeBase]:
    model: ClassVar[type[Any]]
    # Searched with ILIKE; JSONB columns (localized text) are searched across all languages.
    search_columns: ClassVar[Sequence[InstrumentedAttribute[Any]]] = ()
    # Public sort keys → columns. `?sort=-title` sorts descending.
    sort_columns: ClassVar[Mapping[str, InstrumentedAttribute[Any]]] = {}
    default_order: ClassVar[Sequence[Any]] = ()

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, id: uuid.UUID) -> M | None:
        obj: M | None = await self.session.get(self.model, id)
        return obj

    async def get_for_update(self, id: uuid.UUID) -> M | None:
        """Read the row and lock it until the transaction ends (SELECT ... FOR UPDATE).

        A concurrent writer waits here until the first one commits, then sees the new
        version. `populate_existing` refreshes an instance the session already holds.
        """
        stmt = (
            select(self.model)
            .where(self.model.id == id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        obj: M | None = await self.session.scalar(stmt)
        return obj

    async def list(self, params: ListParams, *where: Any) -> tuple[Sequence[M], int]:
        stmt = select(self.model).where(*where)
        if params.q and self.search_columns:
            pattern = like_pattern(params.q)
            stmt = stmt.where(or_(*(cast(c, String).ilike(pattern) for c in self.search_columns)))
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        stmt = (
            stmt.order_by(*self.order_by(params.sort)).offset(params.offset).limit(params.page_size)
        )
        rows: Sequence[M] = (await self.session.scalars(stmt)).all()
        return rows, total

    def order_by(self, sort: str | None) -> Sequence[Any]:
        if not sort:
            return self.default_order
        name = sort.removeprefix("-")
        column = self.sort_columns.get(name)
        if column is None:
            raise ValidationFailed(
                f"Нельзя сортировать по полю «{name}»",
                details=[
                    {"loc": ["query", "sort"], "msg": f"allowed: {sorted(self.sort_columns)}"}
                ],
            )
        return (column.desc() if sort.startswith("-") else column.asc(), self.model.id)

    async def exists(self, *where: Any) -> bool:
        found = await self.session.scalar(select(self.model.id).where(*where).limit(1))
        return found is not None

    def add(self, obj: M) -> None:
        self.session.add(obj)

    async def next_sort_order(self, *scope: Any) -> int:
        """Position after the last row in `scope` (0 for an empty list)."""
        last = await self.session.scalar(select(func.max(self.model.sort_order)).where(*scope))
        return 0 if last is None else last + 10

    async def delete(self, obj: M) -> None:
        await self.session.delete(obj)

    async def reorder(self, ids: Sequence[uuid.UUID], *scope: Any) -> None:
        """Set `sort_order` from the position in `ids` (step 10 leaves room for inserts).

        `ids` must be exactly the current set of rows in `scope`: a missing or extra id
        means someone else added or removed a row meanwhile, so we refuse with 409.
        """
        current = set(await self.session.scalars(select(self.model.id).where(*scope)))
        if len(ids) != len(set(ids)) or set(ids) != current:
            raise Conflict(
                "Список изменился с момента загрузки. Обновите данные и повторите.",
                code="ORDER_MISMATCH",
                details={
                    "missing": sorted(str(i) for i in current - set(ids)),
                    "unknown": sorted(str(i) for i in set(ids) - current),
                },
            )
        for position, row_id in enumerate(ids):
            await self.session.execute(
                update(self.model).where(self.model.id == row_id).values(sort_order=position * 10)
            )
