"""Publishing a page: publish, take down, discard the draft, history, rollback, preview."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.admin.audit import AuditActor

Version = Field(ge=1, description="Page version the client read; a stale one gets 409")


class PublishRequest(BaseModel):
    version: int = Version
    draft_hash: str = Field(
        min_length=64,
        max_length=64,
        description=(
            "From GET /admin/pages/{id}: the draft the editor reviewed. If someone changed "
            "the page since, publishing is refused (409 DRAFT_CHANGED) instead of putting "
            "unseen edits on the site."
        ),
    )
    comment: str | None = Field(default=None, max_length=500, description="What changed")


class PageAction(BaseModel):
    """Take a page down, or drop its draft back to what the site shows."""

    version: int = Version


class RestoreRequest(BaseModel):
    version: int = Version
    publish: bool = Field(
        default=False, description="Also publish the restored content at once (a new revision)"
    )
    comment: str | None = Field(default=None, max_length=500)


class RevisionRead(BaseModel):
    id: uuid.UUID
    number: int
    comment: str | None
    created_at: datetime
    created_by: AuditActor | None = Field(description="None: the system (seeds, migration)")
    is_current: bool = Field(description="The revision the site shows now")
    sections_count: int


class RevisionDetail(RevisionRead):
    snapshot: dict[str, Any] = Field(
        description="Page texts, SEO and all sections in stored form, as they were published"
    )


class PreviewLink(BaseModel):
    token: str
    expires_in: int = Field(description="Seconds")
    path: str = Field(
        description="API path of the draft: GET it to get the page in the PageRead format",
        examples=["/api/v1/preview/pages/about?token=…"],
    )
