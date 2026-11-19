"""rate corrections

Revision ID: bd95489f3861
Revises: 631ce1a21a19
Create Date: 2026-11-19 16:04:03.377448

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'bd95489f3861'
down_revision: Union[str, Sequence[str], None] = '631ce1a21a19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Apply this revision.
    """
    op.create_table('rate_corrections',
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('previous_rate_per_kg', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('new_rate_per_kg', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('new_rate_per_kg >= 0', name=op.f('ck_rate_corrections_new_rate_is_not_negative')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_rate_corrections_created_by_id_users')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_rate_corrections_lot_id_lots')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_rate_corrections_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_rate_corrections'))
    )
    op.create_index(op.f('ix_rate_corrections_lot_id'), 'rate_corrections', ['lot_id'], unique=False)


def downgrade() -> None:
    """
    Revert this revision.
    """
    op.drop_index(op.f('ix_rate_corrections_lot_id'), table_name='rate_corrections')
    op.drop_table('rate_corrections')
