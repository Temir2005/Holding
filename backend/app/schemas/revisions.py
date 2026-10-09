"""The frozen content of a page in `page_revision.snapshot`.

Built from the draft when a page is published (app.services.snapshots), read back by
the public API and by preview, restored into the draft on rollback. The data migration
that created the first revisions writes the same shape with SQL.
"""

import uuid
from typing import Any, Literal

from pydantic import BaseModel


class SnapshotSection(BaseModel):
    id: uuid.UUID
    type: str
    sort_order: int
    # Hidden sections are kept so that a rollback restores them too; the site skips them.
    is_visible: bool
    anchor: str | None
    tone: str
    # Stored form, validated by SECTION_SCHEMAS when the page is rendered.
    data: dict[str, Any]


class SnapshotPage(BaseModel):
    """What publishing covers besides sections. Slug, order and the published flag are
    routing, not content: they change at once."""

    title: dict[str, Any]
    seo_title: dict[str, Any]
    seo_description: dict[str, Any]
    og_image_id: uuid.UUID | None


class PageSnapshot(BaseModel):
    format: Literal[1] = 1
    page: SnapshotPage
    sections: list[SnapshotSection]

    def visible_sections(self) -> list[SnapshotSection]:
        return [s for s in self.sections if s.is_visible]
