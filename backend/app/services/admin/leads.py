"""Leads in the admin: list and filter, status and manager note, CSV export.

Leads come only from the public form (app.services.leads); the admin never creates
or deletes them. Spam is marked with a status, so nothing is lost by mistake.
"""

import csv
import io
from collections.abc import Iterator, Sequence
from datetime import datetime, timedelta, timezone, tzinfo
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Lead
from app.repositories.admin.site import LeadRepository
from app.schemas.admin.common import ListParams, Paginated
from app.schemas.admin.leads import LeadAdminRead, LeadFilters, LeadUpdate
from app.schemas.sections import LEAD_TYPE_LABELS
from app.services.admin.audit import AuditWriter
from app.services.admin.base import CrudService
from app.services.admin.meta import LEAD_STATUS_LABELS

CSV_COLUMNS = {
    "created_at": "Дата",
    "type": "Тема",
    "status": "Статус",
    "name": "Имя",
    "phone": "Телефон",
    "email": "Email",
    "message": "Сообщение",
    "source_page": "Страница",
    "locale": "Язык",
    "manager_note": "Заметка менеджера",
}
# A cell starting with one of these is a formula in Excel and LibreOffice.
FORMULA_START = ("=", "+", "-", "@", "\t", "\r")
# Phones are validated on input (digits, +, brackets, dashes): never a formula.
SAFE_COLUMNS = frozenset({"phone"})


def where(filters: LeadFilters) -> list[Any]:
    conditions: list[Any] = []
    if filters.type is not None:
        conditions.append(Lead.type == filters.type)
    if filters.status is not None:
        conditions.append(Lead.status == filters.status)
    if filters.created_from is not None:
        conditions.append(Lead.created_at >= filters.created_from)
    if filters.created_to is not None:
        conditions.append(Lead.created_at < filters.created_to)
    return conditions


def csv_cell(column: str, value: Any, tz: tzinfo) -> str:
    if value is None:
        text = ""
    elif isinstance(value, datetime):
        text = value.astimezone(tz).isoformat(sep=" ", timespec="minutes")
    elif column == "type":
        text = LEAD_TYPE_LABELS.get(value, str(value))
    elif column == "status":
        text = LEAD_STATUS_LABELS.get(value, str(value))
    else:
        text = str(value)
    if column not in SAFE_COLUMNS and text.startswith(FORMULA_START):
        return "'" + text  # shown as text instead of being run as a formula
    return text


def to_read(lead: Lead) -> LeadAdminRead:
    return LeadAdminRead.model_validate(lead, from_attributes=True)


class LeadAdminService(CrudService[Lead, LeadUpdate, LeadUpdate, LeadAdminRead]):
    entity_type = "lead"
    entity_label = "Заявка"

    def __init__(self, session: AsyncSession, audit: AuditWriter, settings: Settings) -> None:
        self.leads = LeadRepository(session)
        super().__init__(session, self.leads, audit)
        self.export_tz = timezone(timedelta(hours=settings.leads_export_utc_offset_hours))

    def build(self, data: LeadUpdate) -> Lead:
        raise NotImplementedError("Leads are created by the public form only")

    def apply(self, obj: Lead, changes: dict[str, Any]) -> None:
        if "manager_note" in changes:
            changes["manager_note"] = (changes["manager_note"] or "").strip() or None
        super().apply(obj, changes)

    async def present_many(self, rows: Sequence[Lead]) -> list[LeadAdminRead]:
        return [to_read(r) for r in rows]

    async def search(self, params: ListParams, filters: LeadFilters) -> Paginated[LeadAdminRead]:
        return await self.list(params, *where(filters))

    async def export_csv(self, params: ListParams, filters: LeadFilters) -> Iterator[str]:
        """Every lead matching the filters (no paging), as CSV lines for Excel.

        UTF-8 with BOM and `;` as the separator: Excel with Russian regional settings
        opens it with Cyrillic and columns intact. The export itself is logged.
        """
        rows = await self.leads.all(params, *where(filters))
        await self.audit.record(
            action="export",
            entity_type=self.entity_type,
            entity_id=None,
            changes={"filters": filters.model_dump(mode="json"), "q": params.q, "rows": len(rows)},
        )
        await self.session.commit()
        return self._lines(rows, self.export_tz)

    @staticmethod
    def _lines(rows: Sequence[Lead], tz: tzinfo) -> Iterator[str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer, delimiter=";")

        def flush() -> str:
            text = buffer.getvalue()
            buffer.seek(0)
            buffer.truncate()
            return text

        yield "﻿"
        writer.writerow(CSV_COLUMNS.values())
        yield flush()
        for lead in rows:
            writer.writerow([csv_cell(c, getattr(lead, c), tz) for c in CSV_COLUMNS])
            yield flush()
