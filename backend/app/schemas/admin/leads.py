"""Leads in the admin: list with filters, status and manager note, CSV export."""

import uuid
from datetime import datetime

from pydantic import AwareDatetime, BaseModel, Field

from app.models import LeadStatus, LeadType
from app.schemas.admin.common import VersionedUpdate


class LeadAdminRead(BaseModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    type: LeadType
    status: LeadStatus
    name: str
    phone: str | None
    email: str | None
    message: str | None
    source_page: str | None
    locale: str | None
    manager_note: str | None
    version: int


class LeadUpdate(VersionedUpdate):
    not_null = frozenset({"status"})

    status: LeadStatus | None = None
    manager_note: str | None = Field(default=None, max_length=4000)


class LeadFilters(BaseModel):
    type: LeadType | None = None
    status: LeadStatus | None = None
    # With a time zone, so "a day" is the manager's day, not the server's.
    created_from: AwareDatetime | None = Field(
        default=None,
        description="From this moment, inclusive",
        examples=["2026-10-01T00:00:00+05:00"],
    )
    created_to: AwareDatetime | None = Field(
        default=None,
        description="Up to this moment, exclusive",
        examples=["2026-11-01T00:00:00+05:00"],
    )
