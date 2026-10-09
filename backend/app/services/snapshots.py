"""Draft ⇄ snapshot: the one place that knows how a page and its sections are frozen."""

import hashlib
import json
from collections.abc import Sequence

from app.models import Page, PageRevision, Section
from app.schemas.revisions import PageSnapshot, SnapshotPage, SnapshotSection


def build_snapshot(page: Page, sections: Sequence[Section]) -> PageSnapshot:
    """The page's draft as a snapshot. Sections are ordered by position, then id, exactly
    like the data migration orders them, so equal drafts give equal snapshots."""
    ordered = sorted(sections, key=lambda s: (s.sort_order, str(s.id)))
    return PageSnapshot(
        page=SnapshotPage(
            title=dict(page.title),
            seo_title=dict(page.seo_title or {}),
            seo_description=dict(page.seo_description or {}),
            og_image_id=page.og_image_id,
        ),
        sections=[
            SnapshotSection(
                id=s.id,
                type=s.type,
                sort_order=s.sort_order,
                is_visible=s.is_visible,
                anchor=s.anchor,
                tone=s.tone,
                data=dict(s.data),
            )
            for s in ordered
        ],
    )


def differs(draft: PageSnapshot, revision: PageRevision | None) -> bool:
    """Whether the draft has changes the site does not show (always, if never published)."""
    return revision is None or PageSnapshot.model_validate(revision.snapshot) != draft


def snapshot_json(snapshot: PageSnapshot) -> dict[str, object]:
    return snapshot.model_dump(mode="json")


def snapshot_hash(snapshot: PageSnapshot) -> str:
    """Fingerprint of the content: the same draft always gives the same hash."""
    canonical = json.dumps(snapshot_json(snapshot), sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode()).hexdigest()
