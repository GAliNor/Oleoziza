"""season planned status

Revision ID: 3ba167119448
Revises: d0398f4eff15
Create Date: 2026-11-11 15:21:14.031128

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3ba167119448'
down_revision: Union[str, Sequence[str], None] = 'd0398f4eff15'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Let a Season be prepared ahead: add the planned status, allowed for one Season at a time.
    """
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE season_status ADD VALUE IF NOT EXISTS 'planned' BEFORE 'open'")
    op.create_index("uq_seasons_single_planned", "seasons", ["status"], unique=True, postgresql_where=sa.text("status = 'planned'"))


def downgrade() -> None:
    """
    Turn planned Seasons into closed ones and rebuild the status type without planned.
    """
    op.drop_index("uq_seasons_single_planned", table_name="seasons", postgresql_where=sa.text("status = 'planned'"))
    op.execute("UPDATE seasons SET status = 'closed' WHERE status = 'planned'")
    op.drop_index("uq_seasons_single_open", table_name="seasons", postgresql_where=sa.text("status = 'open'"))
    op.execute("ALTER TABLE seasons ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TYPE season_status RENAME TO season_status_old")
    op.execute("CREATE TYPE season_status AS ENUM ('open', 'closed')")
    op.execute("ALTER TABLE seasons ALTER COLUMN status TYPE season_status USING status::text::season_status")
    op.execute("ALTER TABLE seasons ALTER COLUMN status SET DEFAULT 'open'")
    op.execute("DROP TYPE season_status_old")
    op.create_index("uq_seasons_single_open", "seasons", ["status"], unique=True, postgresql_where=sa.text("status = 'open'"))
