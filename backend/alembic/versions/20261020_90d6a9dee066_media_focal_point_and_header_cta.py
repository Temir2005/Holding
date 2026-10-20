"""media focal point; site settings header button

Additive only: two nullable columns on media and one on site_settings.

Revision ID: 90d6a9dee066
Revises: e7bb273c80fb
Create Date: 2026-10-20 17:14:08.794336
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "90d6a9dee066"
down_revision: str | None = "e7bb273c80fb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("media", sa.Column("focal_point_x", sa.Double(), nullable=True))
    op.add_column("media", sa.Column("focal_point_y", sa.Double(), nullable=True))
    op.add_column(
        "site_settings",
        sa.Column("header_cta", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("site_settings", "header_cta")
    op.drop_column("media", "focal_point_y")
    op.drop_column("media", "focal_point_x")
