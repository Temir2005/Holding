"""The shared CRUD flow, exercised on a throwaway `widget` table.

Real entities get `version` columns in later stages; the mechanism is tested here.
"""

import uuid
from collections.abc import AsyncIterator
from typing import Any, ClassVar

import pytest
from pydantic import BaseModel
from sqlalchemy import String
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.errors import Conflict, NotFound, ValidationFailed, VersionConflict
from app.models.base import IdMixin, PublishableMixin, VersionMixin
from app.repositories.admin.base import AdminRepository
from app.schemas.admin.common import ListParams, VersionedUpdate
from app.services.admin.base import CrudService


class ScratchBase(DeclarativeBase):
    pass


class Widget(IdMixin, VersionMixin, PublishableMixin, ScratchBase):
    __tablename__ = "test_widget"
    title: Mapped[str] = mapped_column(String(100))


class WidgetCreate(BaseModel):
    title: str
    sort_order: int = 0


class WidgetUpdate(VersionedUpdate):
    title: str | None = None


class WidgetRead(BaseModel):
    id: uuid.UUID
    title: str
    version: int


class WidgetRepository(AdminRepository[Widget]):
    model = Widget
    search_columns = (Widget.title,)
    sort_columns: ClassVar = {"title": Widget.title, "sort_order": Widget.sort_order}
    default_order = (Widget.sort_order, Widget.id)


class RecordingAudit:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    async def record(self, **event: Any) -> None:
        self.events.append(event)


class WidgetService(CrudService[Widget, WidgetCreate, WidgetUpdate, WidgetRead]):
    entity_type = "widget"
    entity_label = "Виджет"

    def build(self, data: WidgetCreate) -> Widget:
        return Widget(title=data.title, sort_order=data.sort_order)

    def to_read(self, obj: Widget) -> WidgetRead:
        return WidgetRead(id=obj.id, title=obj.title, version=obj.version)

    async def validate(self, obj: Widget) -> None:
        if not obj.title.strip():
            raise ValidationFailed("Пустое название", details=[{"loc": ["title"], "msg": "empty"}])


@pytest.fixture
async def widgets(engine: AsyncEngine) -> AsyncIterator[tuple[WidgetService, RecordingAudit]]:
    async with engine.begin() as conn:
        await conn.run_sync(ScratchBase.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    audit = RecordingAudit()
    async with factory() as session:
        yield WidgetService(session, WidgetRepository(session), audit), audit
    async with engine.begin() as conn:
        await conn.run_sync(ScratchBase.metadata.drop_all)


async def test_create_update_bumps_version_and_audits(
    widgets: tuple[WidgetService, RecordingAudit],
) -> None:
    service, audit = widgets
    created = await service.create(WidgetCreate(title="Первый"))
    assert created.version == 1

    updated = await service.update(created.id, WidgetUpdate(version=1, title="Второй"))
    assert (updated.title, updated.version) == ("Второй", 2)
    assert [e["action"] for e in audit.events] == ["create", "update"]
    assert audit.events[1]["changes"] == {"title": ["Первый", "Второй"]}


async def test_stale_version_is_rejected(widgets: tuple[WidgetService, RecordingAudit]) -> None:
    service, _ = widgets
    created = await service.create(WidgetCreate(title="A"))
    await service.update(created.id, WidgetUpdate(version=1, title="B"))

    with pytest.raises(VersionConflict) as exc:
        await service.update(created.id, WidgetUpdate(version=1, title="C"))
    assert exc.value.details == {"expected_version": 1, "current_version": 2}
    with pytest.raises(VersionConflict):
        await service.delete(created.id, version=1)


async def test_validate_hook_blocks_save(widgets: tuple[WidgetService, RecordingAudit]) -> None:
    service, _ = widgets
    with pytest.raises(ValidationFailed):
        await service.create(WidgetCreate(title="  "))


async def test_list_pages_searches_and_sorts(widgets: tuple[WidgetService, RecordingAudit]) -> None:
    service, _ = widgets
    for i, title in enumerate(["Кран", "Панель 50%", "Панель", "Бетон"]):
        await service.create(WidgetCreate(title=title, sort_order=i))

    page = await service.list(ListParams(page=1, page_size=2))
    assert (page.total, len(page.items)) == (4, 2)
    assert [w.title for w in page.items] == ["Кран", "Панель 50%"]

    found = await service.list(ListParams(q="панель"))
    assert {w.title for w in found.items} == {"Панель", "Панель 50%"}
    # LIKE wildcards in the search text are matched literally.
    assert [w.title for w in (await service.list(ListParams(q="50%"))).items] == ["Панель 50%"]

    by_title = await service.list(ListParams(sort="-title"))
    assert [w.title for w in by_title.items] == ["Панель 50%", "Панель", "Кран", "Бетон"]

    with pytest.raises(ValidationFailed):
        await service.list(ListParams(sort="secret_column"))


async def test_reorder_requires_the_full_current_set(
    widgets: tuple[WidgetService, RecordingAudit],
) -> None:
    service, _ = widgets
    a = await service.create(WidgetCreate(title="A"))
    b = await service.create(WidgetCreate(title="B"))
    c = await service.create(WidgetCreate(title="C"))

    await service.reorder([c.id, a.id, b.id])
    assert [w.title for w in (await service.list(ListParams())).items] == ["C", "A", "B"]

    with pytest.raises(Conflict) as exc:
        await service.reorder([c.id, a.id])
    assert exc.value.code == "ORDER_MISMATCH"


async def test_missing_row_is_not_found(widgets: tuple[WidgetService, RecordingAudit]) -> None:
    service, _ = widgets
    with pytest.raises(NotFound):
        await service.read(uuid.uuid4())


async def test_delete_audits_full_snapshot(widgets: tuple[WidgetService, RecordingAudit]) -> None:
    service, audit = widgets
    created = await service.create(WidgetCreate(title="Удаляемый"))
    await service.delete(created.id, version=1)
    assert audit.events[-1]["action"] == "delete"
    assert audit.events[-1]["changes"]["title"] == "Удаляемый"
    with pytest.raises(NotFound):
        await service.read(created.id)
