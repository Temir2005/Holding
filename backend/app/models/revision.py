import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin


class PageRevision(IdMixin, Base):
    """A published version of a page: its texts and SEO plus all its sections, frozen.

    The public site renders the page's current revision (`page.published_revision_id`);
    the `section` rows are the draft. The shape of `snapshot` is app.schemas.revisions.
    """

    __tablename__ = "page_revision"
    __table_args__ = (UniqueConstraint("page_id", "number"),)

    page_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("page.id", ondelete="CASCADE"))
    # 1, 2, 3... per page.
    number: Mapped[int]
    snapshot: Mapped[dict[str, Any]]
    comment: Mapped[str | None] = mapped_column(String(500))
    # None: written by the system (seeds, data migration).
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("admin_user.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
