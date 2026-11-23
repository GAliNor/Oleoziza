"""expenses to pay, recurring expenses, optional supplier and description

Revision ID: a41c7e0b9d12
Revises: d09fa25845b2
Create Date: 2026-11-23 13:05:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a41c7e0b9d12'
down_revision: Union[str, Sequence[str], None] = 'd09fa25845b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


payment_state = postgresql.ENUM('to_pay', 'paid', name='expense_payment_state', create_type=False)

OPTIONAL_COLUMNS = ('season_id', 'date', 'description', 'amount', 'supplier_id', 'supplier_name', 'paid_by')


def upgrade() -> None:
    """
    Apply this revision: every Expense already entered was paid on its date.
    """
    op.create_table('recurring_expenses',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('frequency', sa.Enum('monthly', 'quarterly', 'yearly', name='recurring_expense_frequency'), nullable=False),
    sa.Column('first_due_on', sa.Date(), nullable=False),
    sa.Column('last_occurrence_on', sa.Date(), nullable=False),
    sa.Column('stopped_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_recurring_expenses_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_recurring_expenses_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_recurring_expenses_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_recurring_expenses'))
    )
    op.create_index(op.f('ix_recurring_expenses_site_id'), 'recurring_expenses', ['site_id'], unique=False)
    payment_state.create(op.get_bind(), checkfirst=True)
    op.add_column('expenses', sa.Column('payment_state', payment_state, server_default='paid', nullable=False))
    op.add_column('expenses', sa.Column('due_on', sa.Date(), nullable=True))
    op.add_column('expenses', sa.Column('recurring_expense_id', sa.Uuid(), nullable=True))
    op.add_column('expenses', sa.Column('occurrence_on', sa.Date(), nullable=True))
    for column in OPTIONAL_COLUMNS:
        op.alter_column('expenses', column, nullable=True)
    op.create_foreign_key(op.f('fk_expenses_recurring_expense_id_recurring_expenses'), 'expenses', 'recurring_expenses', ['recurring_expense_id'], ['id'])
    op.create_index(op.f('ix_expenses_recurring_expense_id'), 'expenses', ['recurring_expense_id'], unique=False)
    op.create_unique_constraint(op.f('uq_expenses_recurring_expense_id_occurrence_on'), 'expenses', ['recurring_expense_id', 'occurrence_on'])
    op.create_index('ix_expenses_site_due_on', 'expenses', ['site_id', 'due_on'], unique=False, postgresql_where=sa.text("payment_state = 'to_pay'"))
    op.drop_constraint(op.f('ck_expenses_amount_is_positive'), 'expenses', type_='check')
    op.create_check_constraint(op.f('ck_expenses_amount_is_positive'), 'expenses', 'amount IS NULL OR amount > 0')
    op.create_check_constraint(op.f('ck_expenses_paid_is_complete'), 'expenses', "payment_state <> 'paid' OR (date IS NOT NULL AND amount IS NOT NULL AND paid_by IS NOT NULL AND season_id IS NOT NULL)")
    op.create_check_constraint(op.f('ck_expenses_to_pay_has_due_date'), 'expenses', "payment_state <> 'to_pay' OR due_on IS NOT NULL")


def downgrade() -> None:
    """
    Revert this revision; Expenses still to pay, or without Supplier or description, have no place in the earlier schema and must be gone first.
    """
    op.drop_constraint(op.f('ck_expenses_to_pay_has_due_date'), 'expenses', type_='check')
    op.drop_constraint(op.f('ck_expenses_paid_is_complete'), 'expenses', type_='check')
    op.drop_constraint(op.f('ck_expenses_amount_is_positive'), 'expenses', type_='check')
    op.create_check_constraint(op.f('ck_expenses_amount_is_positive'), 'expenses', 'amount > 0')
    op.drop_index('ix_expenses_site_due_on', table_name='expenses')
    op.drop_constraint(op.f('uq_expenses_recurring_expense_id_occurrence_on'), 'expenses', type_='unique')
    op.drop_index(op.f('ix_expenses_recurring_expense_id'), table_name='expenses')
    op.drop_constraint(op.f('fk_expenses_recurring_expense_id_recurring_expenses'), 'expenses', type_='foreignkey')
    for column in OPTIONAL_COLUMNS:
        op.alter_column('expenses', column, nullable=False)
    op.drop_column('expenses', 'occurrence_on')
    op.drop_column('expenses', 'recurring_expense_id')
    op.drop_column('expenses', 'due_on')
    op.drop_column('expenses', 'payment_state')
    payment_state.drop(op.get_bind(), checkfirst=True)
    op.drop_index(op.f('ix_recurring_expenses_site_id'), table_name='recurring_expenses')
    op.drop_table('recurring_expenses')
    op.execute('DROP TYPE recurring_expense_frequency')
