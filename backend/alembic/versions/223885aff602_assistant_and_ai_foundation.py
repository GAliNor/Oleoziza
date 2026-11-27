"""assistant and ai foundation

Revision ID: 223885aff602
Revises: c63e9a2d1f45
Create Date: 2026-11-27 18:08:48.329362

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '223885aff602'
down_revision: Union[str, Sequence[str], None] = 'c63e9a2d1f45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add the AI foundation (providers, models, feature settings, usage ledger, payloads) and the Assistant's Conversations, with unaccent for name matching.
    """
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.create_table('ai_providers',
    sa.Column('kind', sa.Enum('openai', 'other', name='ai_provider_kind'), nullable=False),
    sa.Column('label', sa.String(length=120), nullable=False),
    sa.Column('base_url', sa.String(length=300), nullable=False),
    sa.Column('api_style', sa.Enum('openai_chat', name='ai_api_style'), nullable=False),
    sa.Column('sealed_key', sa.Text(), nullable=True),
    sa.Column('key_last_four', sa.String(length=4), nullable=True),
    sa.Column('monthly_budget_usd', sa.Numeric(precision=12, scale=2), server_default='20', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_ai_providers_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_ai_providers_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_ai_providers')),
    sa.UniqueConstraint('label', name=op.f('uq_ai_providers_label'))
    )
    op.create_table('assistant_conversations',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_assistant_conversations_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_assistant_conversations'))
    )
    op.create_index(op.f('ix_assistant_conversations_user_id'), 'assistant_conversations', ['user_id'], unique=False)
    op.create_table('ai_models',
    sa.Column('provider_id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('input_price_per_million', sa.Numeric(precision=12, scale=6), nullable=False),
    sa.Column('cached_input_price_per_million', sa.Numeric(precision=12, scale=6), nullable=True),
    sa.Column('output_price_per_million', sa.Numeric(precision=12, scale=6), nullable=False),
    sa.Column('supports_structured_output', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_ai_models_created_by_id_users')),
    sa.ForeignKeyConstraint(['provider_id'], ['ai_providers.id'], name=op.f('fk_ai_models_provider_id_ai_providers'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_ai_models_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_ai_models')),
    sa.UniqueConstraint('provider_id', 'name', name=op.f('uq_ai_models_provider_id_name'))
    )
    op.create_index(op.f('ix_ai_models_provider_id'), 'ai_models', ['provider_id'], unique=False)
    op.create_table('ai_calls',
    sa.Column('feature', sa.Enum('assistant', 'assistant_transcription', 'connection_test', name='ai_call_feature'), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=True),
    sa.Column('record_type', sa.String(length=64), nullable=True),
    sa.Column('record_id', sa.Uuid(), nullable=True),
    sa.Column('provider_id', sa.Uuid(), nullable=False),
    sa.Column('model_id', sa.Uuid(), nullable=True),
    sa.Column('model_name', sa.String(length=120), nullable=False),
    sa.Column('status', sa.Enum('reserved', 'succeeded', 'failed', 'refused', name='ai_call_status'), nullable=False),
    sa.Column('input_price_per_million', sa.Numeric(precision=12, scale=6), nullable=False),
    sa.Column('cached_input_price_per_million', sa.Numeric(precision=12, scale=6), nullable=True),
    sa.Column('output_price_per_million', sa.Numeric(precision=12, scale=6), nullable=False),
    sa.Column('input_tokens', sa.Integer(), server_default='0', nullable=False),
    sa.Column('cached_input_tokens', sa.Integer(), server_default='0', nullable=False),
    sa.Column('output_tokens', sa.Integer(), server_default='0', nullable=False),
    sa.Column('reserved_cost_usd', sa.Numeric(precision=14, scale=6), nullable=False),
    sa.Column('cost_usd', sa.Numeric(precision=14, scale=6), server_default='0', nullable=False),
    sa.Column('duration_in_milliseconds', sa.Integer(), nullable=True),
    sa.Column('error_code', sa.String(length=64), nullable=True),
    sa.Column('error_detail', sa.Text(), nullable=True),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['model_id'], ['ai_models.id'], name=op.f('fk_ai_calls_model_id_ai_models'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['provider_id'], ['ai_providers.id'], name=op.f('fk_ai_calls_provider_id_ai_providers')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_ai_calls_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_ai_calls'))
    )
    op.create_index('ix_ai_calls_provider_created', 'ai_calls', ['provider_id', 'created_at'], unique=False)
    op.create_index('ix_ai_calls_record', 'ai_calls', ['record_type', 'record_id'], unique=False)
    op.create_index(op.f('ix_ai_calls_user_id'), 'ai_calls', ['user_id'], unique=False)
    op.create_table('ai_feature_settings',
    sa.Column('feature', sa.Enum('assistant', 'assistant_transcription', 'connection_test', name='ai_feature'), nullable=False),
    sa.Column('model_id', sa.Uuid(), nullable=True),
    sa.Column('payload_retention_days', sa.Integer(), nullable=True),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_ai_feature_settings_created_by_id_users')),
    sa.ForeignKeyConstraint(['model_id'], ['ai_models.id'], name=op.f('fk_ai_feature_settings_model_id_ai_models')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_ai_feature_settings_updated_by_id_users')),
    sa.PrimaryKeyConstraint('feature', name=op.f('pk_ai_feature_settings'))
    )
    op.create_table('ai_call_payloads',
    sa.Column('call_id', sa.Uuid(), nullable=False),
    sa.Column('request', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('response', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('purge_after', sa.Date(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['call_id'], ['ai_calls.id'], name=op.f('fk_ai_call_payloads_call_id_ai_calls'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('call_id', name=op.f('pk_ai_call_payloads'))
    )
    op.create_index(op.f('ix_ai_call_payloads_purge_after'), 'ai_call_payloads', ['purge_after'], unique=False)
    op.create_table('assistant_questions',
    sa.Column('conversation_id', sa.Uuid(), nullable=False),
    sa.Column('text', sa.Text(), nullable=False),
    sa.Column('status', sa.Enum('pending', 'answered', 'failed', name='assistant_question_status'), nullable=False),
    sa.Column('scope', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('plan', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('answer', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('error_code', sa.String(length=64), nullable=True),
    sa.Column('stream_cursor', sa.String(length=80), nullable=True),
    sa.Column('rating', sa.SmallInteger(), nullable=True),
    sa.Column('ai_call_id', sa.Uuid(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['ai_call_id'], ['ai_calls.id'], name=op.f('fk_assistant_questions_ai_call_id_ai_calls'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['conversation_id'], ['assistant_conversations.id'], name=op.f('fk_assistant_questions_conversation_id_assistant_conversations'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_assistant_questions'))
    )
    op.create_index(op.f('ix_assistant_questions_conversation_id'), 'assistant_questions', ['conversation_id'], unique=False)


def downgrade() -> None:
    """
    Revert this revision.
    """
    op.drop_index(op.f('ix_assistant_questions_conversation_id'), table_name='assistant_questions')
    op.drop_table('assistant_questions')
    op.drop_index(op.f('ix_ai_call_payloads_purge_after'), table_name='ai_call_payloads')
    op.drop_table('ai_call_payloads')
    op.drop_table('ai_feature_settings')
    op.drop_index(op.f('ix_ai_calls_user_id'), table_name='ai_calls')
    op.drop_index('ix_ai_calls_record', table_name='ai_calls')
    op.drop_index('ix_ai_calls_provider_created', table_name='ai_calls')
    op.drop_table('ai_calls')
    op.drop_index(op.f('ix_ai_models_provider_id'), table_name='ai_models')
    op.drop_table('ai_models')
    op.drop_index(op.f('ix_assistant_conversations_user_id'), table_name='assistant_conversations')
    op.drop_table('assistant_conversations')
    op.drop_table('ai_providers')
    op.execute('DROP TYPE IF EXISTS assistant_question_status')
    op.execute('DROP TYPE IF EXISTS ai_call_status')
    op.execute('DROP TYPE IF EXISTS ai_call_feature')
    op.execute('DROP TYPE IF EXISTS ai_feature')
    op.execute('DROP TYPE IF EXISTS ai_api_style')
    op.execute('DROP TYPE IF EXISTS ai_provider_kind')
