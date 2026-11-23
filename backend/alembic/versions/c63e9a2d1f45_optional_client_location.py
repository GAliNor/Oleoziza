"""optional location of a client, no location on users

Revision ID: c63e9a2d1f45
Revises: b52d8f1c0e34
Create Date: 2026-11-23 13:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c63e9a2d1f45'
down_revision: Union[str, Sequence[str], None] = 'b52d8f1c0e34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


LOCATION_COLUMNS = ('province_id', 'city', 'address')


def upgrade() -> None:
    """
    Apply this revision: a User's address was never asked for nor served, so it goes.
    """
    for column in LOCATION_COLUMNS:
        op.alter_column('clients', column, nullable=True)
    op.drop_constraint(op.f('fk_users_province_id_provinces'), 'users', type_='foreignkey')
    for column in LOCATION_COLUMNS:
        op.drop_column('users', column)


def downgrade() -> None:
    """
    Revert this revision; a Client without a place must be given one first.
    """
    op.add_column('users', sa.Column('address', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('city', sa.String(length=120), nullable=True))
    op.add_column('users', sa.Column('province_id', sa.String(length=64), nullable=True))
    op.create_foreign_key(op.f('fk_users_province_id_provinces'), 'users', 'provinces', ['province_id'], ['id'])
    for column in LOCATION_COLUMNS:
        op.alter_column('clients', column, nullable=False)
