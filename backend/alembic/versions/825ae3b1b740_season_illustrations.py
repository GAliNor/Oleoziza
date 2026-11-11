"""season illustrations

Revision ID: 825ae3b1b740
Revises: 3ba167119448
Create Date: 2026-11-11 15:29:17.363789

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '825ae3b1b740'
down_revision: Union[str, Sequence[str], None] = '3ba167119448'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Apply this revision.
    """
    op.add_column('seasons', sa.Column('illustration_file_id', sa.Uuid(), nullable=True))
    op.add_column('seasons', sa.Column('illustration_dark_file_id', sa.Uuid(), nullable=True))
    op.create_foreign_key(op.f('fk_seasons_illustration_file_id_files'), 'seasons', 'files', ['illustration_file_id'], ['id'])
    op.create_foreign_key(op.f('fk_seasons_illustration_dark_file_id_files'), 'seasons', 'files', ['illustration_dark_file_id'], ['id'])


def downgrade() -> None:
    """
    Revert this revision.
    """
    op.drop_constraint(op.f('fk_seasons_illustration_dark_file_id_files'), 'seasons', type_='foreignkey')
    op.drop_constraint(op.f('fk_seasons_illustration_file_id_files'), 'seasons', type_='foreignkey')
    op.drop_column('seasons', 'illustration_dark_file_id')
    op.drop_column('seasons', 'illustration_file_id')
