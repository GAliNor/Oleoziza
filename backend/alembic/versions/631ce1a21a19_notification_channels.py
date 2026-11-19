"""notification channels

Revision ID: 631ce1a21a19
Revises: 5a6821e5d85b
Create Date: 2026-11-19 09:53:12.508693

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '631ce1a21a19'
down_revision: Union[str, Sequence[str], None] = '5a6821e5d85b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Apply this revision.
    """
    op.execute("ALTER TYPE lot_notification_choice ADD VALUE IF NOT EXISTS 'whatsapp' BEFORE 'sms'")
    op.execute("ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'whatsapp' BEFORE 'sms'")
    op.execute("ALTER TYPE notification_status ADD VALUE IF NOT EXISTS 'queued' BEFORE 'sent'")
    op.create_table('notification_channel_settings',
    sa.Column('channel', sa.Enum('whatsapp', 'sms', 'email', name='notification_channel_setting_channel'), nullable=False),
    sa.Column('is_enabled', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_notification_channel_settings_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_notification_channel_settings_updated_by_id_users')),
    sa.PrimaryKeyConstraint('channel', name=op.f('pk_notification_channel_settings'))
    )


def downgrade() -> None:
    """
    Revert this revision; Postgres can't drop an enum value, so 'whatsapp' stays in lot_notification_choice and notification_channel, and 'queued' in notification_status.
    """
    op.drop_table('notification_channel_settings')
    op.execute("DROP TYPE IF EXISTS notification_channel_setting_channel")
