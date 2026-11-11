"""territory boundaries

Revision ID: d0398f4eff15
Revises: 75374c3a47c6
Create Date: 2026-11-11 11:34:04.355566

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd0398f4eff15'
down_revision: Union[str, Sequence[str], None] = '75374c3a47c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Apply this revision.
    """
    op.add_column('cities', sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column('cities', sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column('cities', sa.Column('boundary', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True))
    op.add_column('provinces', sa.Column('boundary', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True))


def downgrade() -> None:
    """
    Revert this revision.
    """
    op.drop_column('provinces', 'boundary')
    op.drop_column('cities', 'boundary')
    op.drop_column('cities', 'longitude')
    op.drop_column('cities', 'latitude')
