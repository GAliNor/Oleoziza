"""lots received without a press line

Revision ID: b52d8f1c0e34
Revises: a41c7e0b9d12
Create Date: 2026-11-23 13:20:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b52d8f1c0e34'
down_revision: Union[str, Sequence[str], None] = 'a41c7e0b9d12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Apply this revision.
    """
    op.alter_column('lots', 'press_line_id', nullable=True)
    op.alter_column('lots', 'planned_start_at', nullable=True)
    op.create_check_constraint(op.f('ck_lots_line_and_start_come_together'), 'lots', '(press_line_id IS NULL) = (planned_start_at IS NULL)')
    op.create_check_constraint(op.f('ck_lots_only_a_waiting_lot_has_no_line'), 'lots', "status = 'waiting' OR press_line_id IS NOT NULL")
    op.create_index('ix_lots_without_line', 'lots', ['site_id', 'entered_at'], unique=False, postgresql_where=sa.text('press_line_id IS NULL'))


def downgrade() -> None:
    """
    Revert this revision; a Lot without a Press Line must be given one first.
    """
    op.drop_index('ix_lots_without_line', table_name='lots')
    op.drop_constraint(op.f('ck_lots_only_a_waiting_lot_has_no_line'), 'lots', type_='check')
    op.drop_constraint(op.f('ck_lots_line_and_start_come_together'), 'lots', type_='check')
    op.alter_column('lots', 'planned_start_at', nullable=False)
    op.alter_column('lots', 'press_line_id', nullable=False)
