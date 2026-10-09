"""Sections of a page: create, edit, copy, hide, reorder, delete.

`data` is validated with the stored model of the section type (SECTION_SCHEMAS):
an error points at the exact field, e.g. ["body", "data", "steps", 0, "title", "ru"].
References must exist and internal links must lead somewhere (RefService.check).

Structural changes (create, copy, reorder) lock the page row, so two editors
inserting blocks at the same time cannot produce duplicate positions.
"""

import uuid
from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AlreadyExists, NotFound, ValidationFailed
from app.models import Page, Section
from app.repositories.admin.pages import PageRepository, SectionRepository
from app.schemas.admin.pages import SectionAdminRead, SectionCreate, SectionUpdate
from app.schemas.refs import Loc
from app.schemas.sections import (
    SECTION_SCHEMAS,
    ContactFormData,
    SectionData,
    SectionType,
    Tone,
)
from app.services.admin.audit import AuditWriter, snapshot
from app.services.admin.base import Before, CrudService
from app.services.admin.refs import RefService
from app.storage.service import Storage

DATA_LOC: Loc = ("body", "data")


def parse_data(section_type: SectionType, data: dict[str, Any], loc: Loc = DATA_LOC) -> SectionData:
    """Validate section data with its stored model; errors carry the path to the field."""
    try:
        return SECTION_SCHEMAS[section_type].stored.model_validate(data)
    except ValidationError as exc:
        raise ValidationFailed(
            "Проверьте заполнение блока",
            details=[{"loc": [*loc, *err["loc"]], "msg": err["msg"]} for err in exc.errors()],
        ) from exc


def consistency_errors(data: SectionData, loc: Loc = DATA_LOC) -> list[dict[str, Any]]:
    """Rules across fields, checked when the admin saves a block.

    Not in the stored models: those also read data already in the database, and the
    public site must keep rendering it.
    """
    errors: list[dict[str, Any]] = []
    if isinstance(data, ContactFormData):
        if not data.lead_types:
            errors.append({"loc": [*loc, "lead_types"], "msg": "выберите хотя бы одну тему"})
        elif len(set(data.lead_types)) != len(data.lead_types):
            errors.append({"loc": [*loc, "lead_types"], "msg": "тема указана дважды"})
        elif data.default_type not in data.lead_types:
            errors.append(
                {"loc": [*loc, "default_type"], "msg": "тема по умолчанию должна быть в списке тем"}
            )
    return errors


def stored_json(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(mode="json")


class SectionAdminService(CrudService[Section, SectionCreate, SectionUpdate, SectionAdminRead]):
    entity_type = "section"
    entity_label = "Блок"

    def __init__(self, session: AsyncSession, audit: AuditWriter, storage: Storage) -> None:
        self.sections = SectionRepository(session)
        super().__init__(session, self.sections, audit)
        self.pages = PageRepository(session)
        self.refs = RefService(session, storage)

    # --- CrudService hooks ---------------------------------------------------------

    def build(self, data: SectionCreate) -> Section:
        raise NotImplementedError("Sections belong to a page: use create_in(page_id, data)")

    def to_read(self, obj: Section) -> SectionAdminRead:
        section_type = SectionType(obj.type)
        try:
            # Normalized: every field of the type with its default, so the form is complete
            # and saving it back unchanged changes nothing.
            data = stored_json(SECTION_SCHEMAS[section_type].stored.model_validate(obj.data))
        except ValidationError:
            data = dict(obj.data)
        return SectionAdminRead(
            id=obj.id,
            page_id=obj.page_id,
            type=section_type,
            label=SECTION_SCHEMAS[section_type].label,
            sort_order=obj.sort_order,
            is_visible=obj.is_visible,
            anchor=obj.anchor,
            tone=Tone(obj.tone),
            data=data,
            updated_at=obj.updated_at,
            version=obj.version,
        )

    def apply(self, obj: Section, changes: dict[str, Any]) -> None:
        if "data" in changes:
            data = changes.pop("data")
            obj.data = stored_json(parse_data(SectionType(obj.type), data or {}))
        if "tone" in changes and changes["tone"] is not None:
            changes["tone"] = Tone(changes["tone"]).value
        super().apply(obj, changes)

    async def problems(self, section: Section, loc: Loc) -> list[dict[str, Any]]:
        """Everything that would stop this section from being saved, without raising:
        publishing and rollback report all sections of a page at once."""
        try:
            stored = parse_data(SectionType(section.type), section.data, (*loc, "data"))
        except ValidationFailed as exc:
            return list(exc.details or [])
        except ValueError:
            return [{"loc": [*loc, "type"], "msg": f"неизвестный тип блока «{section.type}»"}]
        return await self.refs.problems(stored, (*loc, "data")) + consistency_errors(
            stored, (*loc, "data")
        )

    async def validate(self, obj: Section, before: Before) -> None:
        stored = parse_data(SectionType(obj.type), obj.data)
        await self.refs.check(stored, DATA_LOC, extra=consistency_errors(stored))
        if obj.anchor and await self.sections.exists(
            Section.page_id == obj.page_id, Section.anchor == obj.anchor, Section.id != obj.id
        ):
            raise AlreadyExists(
                f"Якорь «#{obj.anchor}» уже есть на этой странице",
                details=[{"loc": ["body", "anchor"], "msg": "already used on this page"}],
            )

    # --- reads -----------------------------------------------------------------------

    async def full(self, obj: Section) -> SectionAdminRead:
        """Read model plus cards of everything the section references."""
        read = self.to_read(obj)
        try:
            stored = SECTION_SCHEMAS[read.type].stored.model_validate(obj.data)
        except ValidationError:
            return read
        read.refs = await self.refs.cards(stored)
        return read

    async def present_many(self, rows: Sequence[Section]) -> list[SectionAdminRead]:
        return [await self.full(s) for s in rows]

    async def list_for_page(self, page_id: uuid.UUID) -> list[SectionAdminRead]:
        return await self.present_many(await self.sections.of_page(page_id))

    # --- writes ----------------------------------------------------------------------

    async def _locked_page(self, page_id: uuid.UUID) -> Page:
        page = await self.pages.get_for_update(page_id)
        if page is None:
            raise NotFound("Страница не найдена", details={"id": str(page_id)})
        return page

    async def _place(self, page_id: uuid.UUID, section: Section, position: int | None) -> None:
        """Insert `section` at `position` among the page's sections and renumber all."""
        siblings = [s for s in await self.sections.of_page(page_id) if s.id != section.id]
        index = len(siblings) if position is None else min(position, len(siblings))
        siblings.insert(index, section)
        for i, s in enumerate(siblings):
            s.sort_order = i * 10

    async def create_in(self, page_id: uuid.UUID, data: SectionCreate) -> SectionAdminRead:
        async with self.transaction():
            await self._locked_page(page_id)
            stored = parse_data(data.type, data.data)
            section = Section(
                id=uuid.uuid4(),
                page_id=page_id,
                type=data.type.value,
                data=stored_json(stored),
                anchor=data.anchor,
                tone=data.tone.value,
                is_visible=data.is_visible,
            )
            await self.validate(section, None)
            self.sections.add(section)
            await self._place(page_id, section, data.position)
            await self.session.flush()
            await self.audit.record(
                action="create",
                entity_type=self.entity_type,
                entity_id=section.id,
                changes=snapshot(section),
            )
            await self.session.commit()
            await self.session.refresh(section)
            return await self.full(section)

    async def duplicate(self, id: uuid.UUID) -> SectionAdminRead:
        async with self.transaction():
            original = await self.get_or_404(id)
            await self._locked_page(original.page_id)
            position = [s.id for s in await self.sections.of_page(original.page_id)].index(
                original.id
            ) + 1
            copy = Section(
                id=uuid.uuid4(),
                page_id=original.page_id,
                type=original.type,
                data=dict(original.data),
                anchor=None,  # anchors are unique within a page
                tone=original.tone,
                is_visible=original.is_visible,
            )
            self.sections.add(copy)
            await self._place(original.page_id, copy, position)
            await self.session.flush()
            await self.audit.record(
                action="create",
                entity_type=self.entity_type,
                entity_id=copy.id,
                changes={**snapshot(copy), "copied_from": str(original.id)},
            )
            await self.session.commit()
            await self.session.refresh(copy)
            return await self.full(copy)

    async def reorder_page(
        self, page_id: uuid.UUID, ids: list[uuid.UUID]
    ) -> list[SectionAdminRead]:
        await self._locked_page(page_id)
        await self.reorder(ids, Section.page_id == page_id)
        return await self.list_for_page(page_id)

    async def delete(self, id: uuid.UUID, version: int) -> None:
        section = await self.get_or_404(id)
        await self._locked_page(section.page_id)
        await super().delete(id, version)
