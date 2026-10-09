"""page revisions: published snapshots of pages

Revision ID: e7bb273c80fb
Revises: 97d1653f9678
Create Date: 2026-10-08 12:41:50.531607

From here on the public site renders a page from its published revision, not from
the `section` rows (which become the draft). So that the site does not go empty, every
page that is published right now gets revision 1 built from its current sections.

The data step is plain SQL on purpose: a migration must not import application models,
which will keep changing after it is written. The snapshot shape matches
app.schemas.revisions.PageSnapshot (format 1).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "e7bb273c80fb"
down_revision: str | None = "97d1653f9678"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Sections in the same order as the app builds them: by position, then id.
FIRST_REVISIONS = """
WITH snapshots AS (
    SELECT
        p.id AS page_id,
        jsonb_build_object(
            'format', 1,
            'page', jsonb_build_object(
                'title', p.title,
                'seo_title', p.seo_title,
                'seo_description', p.seo_description,
                'og_image_id', p.og_image_id
            ),
            'sections', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', s.id,
                            'type', s.type,
                            'sort_order', s.sort_order,
                            'is_visible', s.is_visible,
                            'anchor', s.anchor,
                            'tone', s.tone,
                            'data', s.data
                        )
                        ORDER BY s.sort_order, s.id
                    )
                    FROM section AS s
                    WHERE s.page_id = p.id
                ),
                '[]'::jsonb
            )
        ) AS snapshot
    FROM page AS p
    WHERE p.is_published
),
created AS (
    INSERT INTO page_revision (id, page_id, number, snapshot, comment, created_at)
    SELECT gen_random_uuid(), page_id, 1, snapshot, 'Перенесено при обновлении', now()
    FROM snapshots
    RETURNING id, page_id
)
UPDATE page
SET published_revision_id = created.id, published_at = now()
FROM created
WHERE page.id = created.page_id
"""


def upgrade() -> None:
    op.create_table(
        "page_revision",
        sa.Column("page_id", sa.UUID(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("comment", sa.String(length=500), nullable=True),
        sa.Column("created_by", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["admin_user.id"],
            name=op.f("fk_page_revision_created_by_admin_user"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["page_id"],
            ["page.id"],
            name=op.f("fk_page_revision_page_id_page"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_page_revision")),
        sa.UniqueConstraint("page_id", "number", name=op.f("uq_page_revision_page_id")),
    )
    op.add_column("page", sa.Column("published_revision_id", sa.UUID(), nullable=True))
    op.add_column("page", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        op.f("fk_page_published_revision_id_page_revision"),
        "page",
        "page_revision",
        ["published_revision_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(FIRST_REVISIONS)


def downgrade() -> None:
    # Revisions are dropped; the draft sections stay, and the old code reads them.
    op.drop_constraint(
        op.f("fk_page_published_revision_id_page_revision"), "page", type_="foreignkey"
    )
    op.drop_column("page", "published_at")
    op.drop_column("page", "published_revision_id")
    op.drop_table("page_revision")
