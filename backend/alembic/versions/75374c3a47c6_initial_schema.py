"""initial schema

Revision ID: 75374c3a47c6
Revises: 
Create Date: 2026-11-11 11:13:18.871294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '75374c3a47c6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Apply this revision.
    """
    op.create_table('provinces',
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('kind', sa.Enum('province', 'prefecture', name='province_kind'), nullable=False),
    sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=True),
    sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_provinces'))
    )
    op.create_table('cities',
    sa.Column('province_id', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['province_id'], ['provinces.id'], name=op.f('fk_cities_province_id_provinces')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_cities')),
    sa.UniqueConstraint('province_id', 'name', name=op.f('uq_cities_province_id_name'))
    )
    op.create_table('users',
    sa.Column('role', sa.Enum('management', 'operator', 'accountant', 'client', name='user_role'), nullable=False),
    sa.Column('is_owner', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=True),
    sa.Column('client_contact_id', sa.Uuid(), nullable=True),
    sa.Column('title', sa.Enum('mr', 'mrs', 'dr', 'prof', 'counsel', 'hajj', 'hajja', name='user_title'), nullable=True),
    sa.Column('first_name', sa.String(length=120), nullable=False),
    sa.Column('last_name', sa.String(length=120), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('email', sa.String(length=254), nullable=True),
    sa.Column('province_id', sa.String(length=64), nullable=True),
    sa.Column('city', sa.String(length=120), nullable=True),
    sa.Column('address', sa.String(length=255), nullable=True),
    sa.Column('language', sa.Enum('fr', 'ar', name='user_language'), server_default='fr', nullable=False),
    sa.Column('status', sa.Enum('invited', 'active', 'disabled', name='user_status'), server_default='invited', nullable=False),
    sa.Column('must_change_credential', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False),
    sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('disabled_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('token_version', sa.Integer(), server_default='0', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('phone IS NOT NULL OR email IS NOT NULL', name=op.f('ck_users_has_phone_or_email')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_users_created_by_id_users')),
    sa.ForeignKeyConstraint(['province_id'], ['provinces.id'], name=op.f('fk_users_province_id_provinces')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_users_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
    sa.UniqueConstraint('email', name=op.f('uq_users_email')),
    sa.UniqueConstraint('phone', name=op.f('uq_users_phone'))
    )
    op.create_table('credentials',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.Enum('pin', 'password', name='credential_kind'), nullable=False),
    sa.Column('hash', sa.String(length=255), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_credentials_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_credentials_updated_by_id_users')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_credentials_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_credentials')),
    sa.UniqueConstraint('user_id', 'kind', name=op.f('uq_credentials_user_id_kind'))
    )
    op.create_table('files',
    sa.Column('bucket', sa.Enum('private', 'public', name='file_bucket'), nullable=False),
    sa.Column('storage_key', sa.String(length=512), nullable=False),
    sa.Column('original_name', sa.String(length=255), nullable=False),
    sa.Column('content_type', sa.String(length=100), nullable=False),
    sa.Column('size_in_bytes', sa.BigInteger(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_files_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_files_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_files')),
    sa.UniqueConstraint('storage_key', name=op.f('uq_files_storage_key'))
    )
    op.create_table('invitations',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('channel', sa.Enum('sms', 'email', name='invitation_channel'), nullable=False),
    sa.Column('sent_to', sa.String(length=254), nullable=False),
    sa.Column('token_hash', sa.String(length=255), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_invitations_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_invitations_updated_by_id_users')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_invitations_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_invitations')),
    sa.UniqueConstraint('token_hash', name=op.f('uq_invitations_token_hash'))
    )
    op.create_table('one_time_codes',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('purpose', sa.Enum('login', 'reset', name='one_time_code_purpose'), nullable=False),
    sa.Column('channel', sa.Enum('sms', 'email', name='one_time_code_channel'), nullable=False),
    sa.Column('code_hash', sa.String(length=255), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_one_time_codes_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_one_time_codes'))
    )
    op.create_table('seasons',
    sa.Column('code', sa.String(length=4), nullable=False),
    sa.Column('label', sa.String(length=120), nullable=False),
    sa.Column('starts_on', sa.Date(), nullable=False),
    sa.Column('ends_on', sa.Date(), nullable=True),
    sa.Column('status', sa.Enum('open', 'closed', name='season_status'), server_default='open', nullable=False),
    sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('closed_by_id', sa.Uuid(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['closed_by_id'], ['users.id'], name=op.f('fk_seasons_closed_by_id_users')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_seasons_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_seasons_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_seasons')),
    sa.UniqueConstraint('code', name=op.f('uq_seasons_code'))
    )
    op.create_index('uq_seasons_single_open', 'seasons', ['status'], unique=True, postgresql_where=sa.text("status = 'open'"))
    op.create_table('sites',
    sa.Column('code', sa.String(length=2), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('tax_identifier', sa.String(length=100), nullable=True),
    sa.Column('company_identifier', sa.String(length=100), nullable=True),
    sa.Column('onssa_authorisation', sa.String(length=100), nullable=True),
    sa.Column('status', sa.Enum('active', 'closed', name='site_status'), server_default='active', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('province_id', sa.String(length=64), nullable=False),
    sa.Column('city', sa.String(length=120), nullable=False),
    sa.Column('address', sa.String(length=255), nullable=False),
    sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=True),
    sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_sites_created_by_id_users')),
    sa.ForeignKeyConstraint(['province_id'], ['provinces.id'], name=op.f('fk_sites_province_id_provinces')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_sites_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_sites')),
    sa.UniqueConstraint('code', name=op.f('uq_sites_code'))
    )
    op.create_table('user_login_methods',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('method', sa.Enum('phone_pin', 'email_password', 'phone_otp', name='user_login_method_method'), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_user_login_methods_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_user_login_methods_updated_by_id_users')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_user_login_methods_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_user_login_methods')),
    sa.UniqueConstraint('user_id', 'method', name=op.f('uq_user_login_methods_user_id_method'))
    )
    op.create_table('audit_events',
    sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('actor_id', sa.Uuid(), nullable=True),
    sa.Column('site_id', sa.Uuid(), nullable=True),
    sa.Column('action', sa.String(length=100), nullable=False),
    sa.Column('entity_type', sa.String(length=50), nullable=True),
    sa.Column('entity_id', sa.Uuid(), nullable=True),
    sa.Column('before', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('after', sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql'), nullable=True),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], name=op.f('fk_audit_events_actor_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_audit_events_site_id_sites')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_events'))
    )
    op.create_index('ix_audit_events_entity_type_entity_id', 'audit_events', ['entity_type', 'entity_id'], unique=False)
    op.create_index('ix_audit_events_site_id_occurred_at', 'audit_events', ['site_id', 'occurred_at'], unique=False)
    op.create_table('boxes',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('number', sa.Integer(), nullable=False),
    sa.Column('capacity_in_kg', sa.Numeric(precision=10, scale=1), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('retired_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_boxes_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_boxes_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_boxes_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_boxes')),
    sa.UniqueConstraint('site_id', 'number', name=op.f('uq_boxes_site_id_number'))
    )
    op.create_table('clients',
    sa.Column('kind', sa.Enum('individual', 'company', name='client_kind'), nullable=False),
    sa.Column('title', sa.Enum('mr', 'mrs', 'dr', 'prof', 'counsel', 'hajj', 'hajja', name='client_title'), nullable=True),
    sa.Column('first_name', sa.String(length=120), nullable=True),
    sa.Column('last_name', sa.String(length=120), nullable=True),
    sa.Column('national_id_number', sa.String(length=10), nullable=True),
    sa.Column('legal_name', sa.String(length=120), nullable=True),
    sa.Column('company_identifier', sa.String(length=15), nullable=True),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('email', sa.String(length=254), nullable=True),
    sa.Column('status', sa.Enum('active', 'merged', name='client_status'), server_default='active', nullable=False),
    sa.Column('merged_into_id', sa.Uuid(), nullable=True),
    sa.Column('first_site_id', sa.Uuid(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('entered_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.Column('province_id', sa.String(length=64), nullable=False),
    sa.Column('city', sa.String(length=120), nullable=False),
    sa.Column('address', sa.String(length=255), nullable=False),
    sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=True),
    sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=True),
    sa.CheckConstraint("kind <> 'company' OR legal_name IS NOT NULL", name=op.f('ck_clients_company_has_legal_name')),
    sa.CheckConstraint("kind <> 'individual' OR (first_name IS NOT NULL AND last_name IS NOT NULL)", name=op.f('ck_clients_individual_has_names')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_clients_created_by_id_users')),
    sa.ForeignKeyConstraint(['first_site_id'], ['sites.id'], name=op.f('fk_clients_first_site_id_sites')),
    sa.ForeignKeyConstraint(['merged_into_id'], ['clients.id'], name=op.f('fk_clients_merged_into_id_clients')),
    sa.ForeignKeyConstraint(['province_id'], ['provinces.id'], name=op.f('fk_clients_province_id_provinces')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_clients_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_clients'))
    )
    op.create_table('code_sequences',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('season_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.Enum('lot', 'payment', 'refund', 'withdrawal', 'payout', name='code_sequence_kind'), nullable=False),
    sa.Column('last_number', sa.Integer(), server_default='0', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['season_id'], ['seasons.id'], name=op.f('fk_code_sequences_season_id_seasons')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_code_sequences_site_id_sites')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_code_sequences')),
    sa.UniqueConstraint('site_id', 'season_id', 'kind', name=op.f('uq_code_sequences_site_id_season_id_kind'))
    )
    op.create_table('olive_varieties',
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('image_file_id', sa.Uuid(), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.ForeignKeyConstraint(['image_file_id'], ['files.id'], name=op.f('fk_olive_varieties_image_file_id_files')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_olive_varieties'))
    )
    op.create_table('payment_method_settings',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('method', sa.Enum('cash', 'cheque', 'transfer', 'oil', name='payment_method_setting_method'), nullable=False),
    sa.Column('is_enabled', sa.Boolean(), nullable=False),
    sa.Column('is_proof_required', sa.Boolean(), nullable=False),
    sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_payment_method_settings_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_payment_method_settings_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_payment_method_settings_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_payment_method_settings'))
    )
    op.create_table('press_lines',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('number', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('retired_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_press_lines_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_press_lines_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_press_lines_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_press_lines')),
    sa.UniqueConstraint('site_id', 'number', name=op.f('uq_press_lines_site_id_number'))
    )
    op.create_table('site_assignments',
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_site_assignments_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_site_assignments_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_site_assignments_updated_by_id_users')),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_site_assignments_user_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_site_assignments')),
    sa.UniqueConstraint('user_id', 'site_id', name=op.f('uq_site_assignments_user_id_site_id'))
    )
    op.create_table('site_settings',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('season_id', sa.Uuid(), nullable=True),
    sa.Column('key', sa.Enum('milling_rate_per_kg', 'discount_limit_percent', 'oil_price_per_litre', 'daily_price_per_kg', name='site_setting_key'), nullable=False),
    sa.Column('value', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('effective_from', sa.DateTime(timezone=True), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("season_id IS NOT NULL OR key = 'daily_price_per_kg'", name=op.f('ck_site_settings_season_set_unless_daily_price')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_site_settings_created_by_id_users')),
    sa.ForeignKeyConstraint(['season_id'], ['seasons.id'], name=op.f('fk_site_settings_season_id_seasons')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_site_settings_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_site_settings_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_site_settings'))
    )
    op.create_table('tanks',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('number', sa.Integer(), nullable=False),
    sa.Column('capacity_in_litres', sa.Numeric(precision=10, scale=1), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('retired_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_tanks_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_tanks_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_tanks_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tanks')),
    sa.UniqueConstraint('site_id', 'number', name=op.f('uq_tanks_site_id_number'))
    )
    op.create_table('client_contacts',
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.Enum('mr', 'mrs', 'dr', 'prof', 'counsel', 'hajj', 'hajja', name='client_contact_title'), nullable=True),
    sa.Column('first_name', sa.String(length=120), nullable=False),
    sa.Column('last_name', sa.String(length=120), nullable=False),
    sa.Column('job_title', sa.String(length=120), nullable=True),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('email', sa.String(length=254), nullable=True),
    sa.Column('is_primary', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('phone IS NOT NULL OR email IS NOT NULL', name=op.f('ck_client_contacts_has_phone_or_email')),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_client_contacts_client_id_clients')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_client_contacts_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_client_contacts_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_client_contacts'))
    )
    op.create_table('debt_contacts',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.Enum('call', 'sms', 'visit', 'note', name='debt_contact_kind'), nullable=False),
    sa.Column('note', sa.Text(), nullable=False),
    sa.Column('promised_on', sa.Date(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('entered_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_debt_contacts_client_id_clients')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_debt_contacts_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_debt_contacts_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_debt_contacts_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_debt_contacts'))
    )
    op.create_table('lots',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('season_id', sa.Uuid(), nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('mode', sa.Enum('service_milling', 'purchase', name='lot_mode'), nullable=False),
    sa.Column('olive_variety_id', sa.String(length=64), nullable=False),
    sa.Column('net_weight_in_kg', sa.Numeric(precision=10, scale=1), nullable=False),
    sa.Column('suggested_milling_rate_per_kg', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('milling_rate_per_kg', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('suggested_daily_price_per_kg', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('daily_price_per_kg', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('notification_choice', sa.Enum('sms', 'email', 'none', name='lot_notification_choice'), nullable=False),
    sa.Column('status', sa.Enum('waiting', 'pressing', 'pressed', 'withdrawn', name='lot_status'), server_default='waiting', nullable=False),
    sa.Column('press_line_id', sa.Uuid(), nullable=False),
    sa.Column('planned_start_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('pressing_started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('pressing_started_by_id', sa.Uuid(), nullable=True),
    sa.Column('pressing_ended_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('pressing_ended_by_id', sa.Uuid(), nullable=True),
    sa.Column('oil_in_litres', sa.Numeric(precision=10, scale=1), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('entered_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.Column('code', sa.String(length=20), nullable=True),
    sa.CheckConstraint("mode <> 'service_milling' OR (suggested_milling_rate_per_kg IS NOT NULL AND milling_rate_per_kg IS NOT NULL)", name=op.f('ck_lots_service_milling_has_rates')),
    sa.CheckConstraint('net_weight_in_kg > 0', name=op.f('ck_lots_net_weight_is_positive')),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_lots_client_id_clients')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_lots_created_by_id_users')),
    sa.ForeignKeyConstraint(['olive_variety_id'], ['olive_varieties.id'], name=op.f('fk_lots_olive_variety_id_olive_varieties')),
    sa.ForeignKeyConstraint(['press_line_id'], ['press_lines.id'], name=op.f('fk_lots_press_line_id_press_lines')),
    sa.ForeignKeyConstraint(['pressing_ended_by_id'], ['users.id'], name=op.f('fk_lots_pressing_ended_by_id_users')),
    sa.ForeignKeyConstraint(['pressing_started_by_id'], ['users.id'], name=op.f('fk_lots_pressing_started_by_id_users')),
    sa.ForeignKeyConstraint(['season_id'], ['seasons.id'], name=op.f('fk_lots_season_id_seasons')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_lots_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_lots_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_lots')),
    sa.UniqueConstraint('code', name=op.f('uq_lots_code'))
    )
    op.create_table('payments',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('method', sa.Enum('cash', 'cheque', 'transfer', 'oil', name='payment_method'), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('cheque_number', sa.String(length=30), nullable=True),
    sa.Column('bank_name', sa.String(length=120), nullable=True),
    sa.Column('reference', sa.String(length=100), nullable=True),
    sa.Column('oil_in_litres', sa.Numeric(precision=10, scale=1), nullable=True),
    sa.Column('oil_price_per_litre', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('status', sa.Enum('pending', 'confirmed', 'rejected', 'cancelled', name='payment_status'), server_default='pending', nullable=False),
    sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('decided_by_id', sa.Uuid(), nullable=True),
    sa.Column('decision_note', sa.Text(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('entered_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.Column('code', sa.String(length=20), nullable=True),
    sa.CheckConstraint("method <> 'oil' OR (oil_in_litres IS NOT NULL AND oil_price_per_litre IS NOT NULL)", name=op.f('ck_payments_oil_payment_has_litres_and_price')),
    sa.CheckConstraint('amount > 0', name=op.f('ck_payments_amount_is_positive')),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_payments_client_id_clients')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_payments_created_by_id_users')),
    sa.ForeignKeyConstraint(['decided_by_id'], ['users.id'], name=op.f('fk_payments_decided_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_payments_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_payments_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_payments')),
    sa.UniqueConstraint('code', name=op.f('uq_payments_code'))
    )
    op.create_table('site_assignment_permissions',
    sa.Column('site_assignment_id', sa.Uuid(), nullable=False),
    sa.Column('permission', sa.Enum('reception.create', 'lot.update_status', 'lot.set_price', 'pressing.create', 'withdrawal.create', 'client.view', 'client.create', 'client.edit', 'client.manage_access', 'payment.record', 'payout.record', 'payment.confirm', 'payment.cancel', 'document.add', 'refund.manage', 'discount.give', 'discount.approve', 'debt.follow', 'record.correct', 'expense.record', 'purchase.create', 'sale.create', 'daily_price.set', 'product.manage', 'finance.view', 'stock.view', 'user.manage', 'site.manage', 'season.manage', 'audit_trail.view', 'dashboard.view', 'configuration.manage', name='site_assignment_permission_permission'), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_site_assignment_permissions_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_assignment_id'], ['site_assignments.id'], name=op.f('fk_site_assignment_permissions_site_assignment_id_site_assignments'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_site_assignment_permissions_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_site_assignment_permissions')),
    sa.UniqueConstraint('site_assignment_id', 'permission', name=op.f('uq_site_assignment_permissions_site_assignment_id_permission'))
    )
    op.create_table('box_occupancies',
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('box_id', sa.Uuid(), nullable=False),
    sa.Column('occupied_from', sa.DateTime(timezone=True), nullable=False),
    sa.Column('occupied_until', sa.DateTime(timezone=True), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['box_id'], ['boxes.id'], name=op.f('fk_box_occupancies_box_id_boxes')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_box_occupancies_created_by_id_users')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_box_occupancies_lot_id_lots')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_box_occupancies_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_box_occupancies'))
    )
    op.create_index('uq_box_occupancies_single_open_per_box', 'box_occupancies', ['box_id'], unique=True, postgresql_where=sa.text('occupied_until IS NULL'))
    op.create_table('credit_notes',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('origin', sa.Enum('payment_cancelled', 'overpayment', name='credit_note_origin'), nullable=False),
    sa.Column('source_payment_id', sa.Uuid(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('amount > 0', name=op.f('ck_credit_notes_amount_is_positive')),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_credit_notes_client_id_clients')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_credit_notes_created_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_credit_notes_site_id_sites')),
    sa.ForeignKeyConstraint(['source_payment_id'], ['payments.id'], name=op.f('fk_credit_notes_source_payment_id_payments')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_credit_notes_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_credit_notes'))
    )
    op.create_table('discounts',
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('entered_as', sa.Enum('percent', 'amount', name='discount_entered_as'), nullable=False),
    sa.Column('percent', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('limit_percent', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('state', sa.Enum('applied', 'pending', 'approved', 'refused', name='discount_state'), nullable=False),
    sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('decided_by_id', sa.Uuid(), nullable=True),
    sa.Column('refusal_reason', sa.Text(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("state <> 'refused' OR refusal_reason IS NOT NULL", name=op.f('ck_discounts_refusal_has_reason')),
    sa.CheckConstraint('amount > 0', name=op.f('ck_discounts_amount_is_positive')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_discounts_created_by_id_users')),
    sa.ForeignKeyConstraint(['decided_by_id'], ['users.id'], name=op.f('fk_discounts_decided_by_id_users')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_discounts_lot_id_lots')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_discounts_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_discounts'))
    )
    op.create_index('uq_discounts_single_in_force_per_lot', 'discounts', ['lot_id'], unique=True, postgresql_where=sa.text("state <> 'refused'"))
    op.create_table('lot_photos',
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('step', sa.Enum('reception', 'pressing_started', 'pressed', 'stored', 'withdrawal', name='lot_photo_step'), nullable=False),
    sa.Column('file_id', sa.Uuid(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('entered_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_lot_photos_created_by_id_users')),
    sa.ForeignKeyConstraint(['file_id'], ['files.id'], name=op.f('fk_lot_photos_file_id_files')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_lot_photos_lot_id_lots')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_lot_photos_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_lot_photos'))
    )
    op.create_table('notifications',
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('event', sa.Enum('pressed', 'payment_confirmed', name='notification_event'), nullable=False),
    sa.Column('channel', sa.Enum('sms', 'email', name='notification_channel'), nullable=False),
    sa.Column('sent_to', sa.String(length=254), nullable=False),
    sa.Column('sent_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('status', sa.Enum('sent', 'failed', 'simulated', name='notification_status'), nullable=False),
    sa.Column('failure_reason', sa.Text(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_notifications_lot_id_lots')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_notifications'))
    )
    op.create_table('payment_allocations',
    sa.Column('payment_id', sa.Uuid(), nullable=False),
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('amount > 0', name=op.f('ck_payment_allocations_amount_is_positive')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_payment_allocations_created_by_id_users')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_payment_allocations_lot_id_lots')),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], name=op.f('fk_payment_allocations_payment_id_payments')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_payment_allocations_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_payment_allocations')),
    sa.UniqueConstraint('payment_id', 'lot_id', name=op.f('uq_payment_allocations_payment_id_lot_id'))
    )
    op.create_table('pressing_pauses',
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('reason', sa.Enum('breakdown', 'cleaning', 'other', name='pressing_pause_reason'), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('paused_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('resumed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('resumed_by_id', sa.Uuid(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('entered_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_pressing_pauses_created_by_id_users')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_pressing_pauses_lot_id_lots')),
    sa.ForeignKeyConstraint(['resumed_by_id'], ['users.id'], name=op.f('fk_pressing_pauses_resumed_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_pressing_pauses_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_pressing_pauses'))
    )
    op.create_table('refunds',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('origin', sa.Enum('payment_cancelled', 'overpayment', name='refund_origin'), nullable=False),
    sa.Column('source_payment_id', sa.Uuid(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('status', sa.Enum('to_make', 'made', 'confirmed', name='refund_status'), server_default='to_make', nullable=False),
    sa.Column('method', sa.Enum('cash', 'cheque', 'transfer', 'oil', name='refund_method'), nullable=True),
    sa.Column('reference', sa.String(length=100), nullable=True),
    sa.Column('made_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('made_by_id', sa.Uuid(), nullable=True),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('confirmed_by_id', sa.Uuid(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('code', sa.String(length=20), nullable=True),
    sa.CheckConstraint("method IS NULL OR method <> 'oil'", name=op.f('ck_refunds_method_is_not_oil')),
    sa.CheckConstraint('amount > 0', name=op.f('ck_refunds_amount_is_positive')),
    sa.CheckConstraint('confirmed_by_id IS NULL OR confirmed_by_id <> made_by_id', name=op.f('ck_refunds_confirmed_by_someone_else')),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_refunds_client_id_clients')),
    sa.ForeignKeyConstraint(['confirmed_by_id'], ['users.id'], name=op.f('fk_refunds_confirmed_by_id_users')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_refunds_created_by_id_users')),
    sa.ForeignKeyConstraint(['made_by_id'], ['users.id'], name=op.f('fk_refunds_made_by_id_users')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_refunds_site_id_sites')),
    sa.ForeignKeyConstraint(['source_payment_id'], ['payments.id'], name=op.f('fk_refunds_source_payment_id_payments')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_refunds_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_refunds')),
    sa.UniqueConstraint('code', name=op.f('uq_refunds_code'))
    )
    op.create_table('storages',
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('tank_id', sa.Uuid(), nullable=False),
    sa.Column('owner', sa.Enum('client', 'mill', name='storage_owner'), nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=True),
    sa.Column('oil_in_litres', sa.Numeric(precision=10, scale=1), nullable=False),
    sa.Column('stored_from', sa.DateTime(timezone=True), nullable=False),
    sa.Column('planned_until', sa.Date(), nullable=True),
    sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('source_payment_id', sa.Uuid(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('entered_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.CheckConstraint("owner <> 'client' OR client_id IS NOT NULL", name=op.f('ck_storages_client_storage_names_client')),
    sa.CheckConstraint('oil_in_litres > 0', name=op.f('ck_storages_oil_is_positive')),
    sa.ForeignKeyConstraint(['client_id'], ['clients.id'], name=op.f('fk_storages_client_id_clients')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_storages_created_by_id_users')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_storages_lot_id_lots')),
    sa.ForeignKeyConstraint(['source_payment_id'], ['payments.id'], name=op.f('fk_storages_source_payment_id_payments')),
    sa.ForeignKeyConstraint(['tank_id'], ['tanks.id'], name=op.f('fk_storages_tank_id_tanks')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_storages_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_storages'))
    )
    op.create_table('withdrawals',
    sa.Column('site_id', sa.Uuid(), nullable=False),
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('kind', sa.Enum('handover', 'withdrawal', name='withdrawal_kind'), nullable=False),
    sa.Column('taken_by_name', sa.String(length=120), nullable=False),
    sa.Column('taken_by_phone', sa.String(length=20), nullable=True),
    sa.Column('is_taken_by_client', sa.Boolean(), nullable=False),
    sa.Column('was_unpaid', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('entered_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('was_recorded_offline', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('device_label', sa.String(length=120), nullable=True),
    sa.Column('code', sa.String(length=20), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_withdrawals_created_by_id_users')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_withdrawals_lot_id_lots')),
    sa.ForeignKeyConstraint(['site_id'], ['sites.id'], name=op.f('fk_withdrawals_site_id_sites')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_withdrawals_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_withdrawals')),
    sa.UniqueConstraint('code', name=op.f('uq_withdrawals_code'))
    )
    op.create_table('credit_note_uses',
    sa.Column('credit_note_id', sa.Uuid(), nullable=False),
    sa.Column('lot_id', sa.Uuid(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('amount > 0', name=op.f('ck_credit_note_uses_amount_is_positive')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_credit_note_uses_created_by_id_users')),
    sa.ForeignKeyConstraint(['credit_note_id'], ['credit_notes.id'], name=op.f('fk_credit_note_uses_credit_note_id_credit_notes')),
    sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], name=op.f('fk_credit_note_uses_lot_id_lots')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_credit_note_uses_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_credit_note_uses'))
    )
    op.create_table('payment_proofs',
    sa.Column('file_id', sa.Uuid(), nullable=False),
    sa.Column('payment_id', sa.Uuid(), nullable=True),
    sa.Column('refund_id', sa.Uuid(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('(payment_id IS NULL) <> (refund_id IS NULL)', name=op.f('ck_payment_proofs_proves_one_payment_or_refund')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_payment_proofs_created_by_id_users')),
    sa.ForeignKeyConstraint(['file_id'], ['files.id'], name=op.f('fk_payment_proofs_file_id_files')),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], name=op.f('fk_payment_proofs_payment_id_payments')),
    sa.ForeignKeyConstraint(['refund_id'], ['refunds.id'], name=op.f('fk_payment_proofs_refund_id_refunds')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_payment_proofs_updated_by_id_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_payment_proofs'))
    )
    op.create_table('storage_draws',
    sa.Column('storage_id', sa.Uuid(), nullable=False),
    sa.Column('oil_in_litres', sa.Numeric(precision=10, scale=1), nullable=False),
    sa.Column('reason', sa.Enum('withdrawal', 'oil_payment', 'sale', name='storage_draw_reason'), nullable=False),
    sa.Column('withdrawal_id', sa.Uuid(), nullable=True),
    sa.Column('payment_id', sa.Uuid(), nullable=True),
    sa.Column('is_reversed', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("reason <> 'oil_payment' OR payment_id IS NOT NULL", name=op.f('ck_storage_draws_oil_payment_draw_names_payment')),
    sa.CheckConstraint("reason <> 'withdrawal' OR withdrawal_id IS NOT NULL", name=op.f('ck_storage_draws_withdrawal_draw_names_withdrawal')),
    sa.CheckConstraint('oil_in_litres > 0', name=op.f('ck_storage_draws_oil_is_positive')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_storage_draws_created_by_id_users')),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], name=op.f('fk_storage_draws_payment_id_payments')),
    sa.ForeignKeyConstraint(['storage_id'], ['storages.id'], name=op.f('fk_storage_draws_storage_id_storages')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_storage_draws_updated_by_id_users')),
    sa.ForeignKeyConstraint(['withdrawal_id'], ['withdrawals.id'], name=op.f('fk_storage_draws_withdrawal_id_withdrawals')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_storage_draws'))
    )
    op.create_table('withdrawal_lines',
    sa.Column('withdrawal_id', sa.Uuid(), nullable=False),
    sa.Column('container_in_litres', sa.Numeric(precision=10, scale=1), nullable=False),
    sa.Column('container_count', sa.Integer(), nullable=False),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_by_id', sa.Uuid(), nullable=True),
    sa.Column('updated_by_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('container_count > 0', name=op.f('ck_withdrawal_lines_container_count_is_positive')),
    sa.CheckConstraint('container_in_litres > 0', name=op.f('ck_withdrawal_lines_container_is_positive')),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name=op.f('fk_withdrawal_lines_created_by_id_users')),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], name=op.f('fk_withdrawal_lines_updated_by_id_users')),
    sa.ForeignKeyConstraint(['withdrawal_id'], ['withdrawals.id'], name=op.f('fk_withdrawal_lines_withdrawal_id_withdrawals')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_withdrawal_lines'))
    )
    op.create_foreign_key(op.f('fk_users_client_id_clients'), 'users', 'clients', ['client_id'], ['id'])
    op.create_foreign_key(op.f('fk_users_client_contact_id_client_contacts'), 'users', 'client_contacts', ['client_contact_id'], ['id'])

def downgrade() -> None:
    """
    Revert this revision.
    """
    op.drop_constraint(op.f('fk_users_client_contact_id_client_contacts'), 'users', type_='foreignkey')
    op.drop_constraint(op.f('fk_users_client_id_clients'), 'users', type_='foreignkey')
    op.drop_table('withdrawal_lines')
    op.drop_table('storage_draws')
    op.drop_table('payment_proofs')
    op.drop_table('credit_note_uses')
    op.drop_table('withdrawals')
    op.drop_table('storages')
    op.drop_table('refunds')
    op.drop_table('pressing_pauses')
    op.drop_table('payment_allocations')
    op.drop_table('notifications')
    op.drop_table('lot_photos')
    op.drop_index('uq_discounts_single_in_force_per_lot', table_name='discounts', postgresql_where=sa.text("state <> 'refused'"))
    op.drop_table('discounts')
    op.drop_table('credit_notes')
    op.drop_index('uq_box_occupancies_single_open_per_box', table_name='box_occupancies', postgresql_where=sa.text('occupied_until IS NULL'))
    op.drop_table('box_occupancies')
    op.drop_table('site_assignment_permissions')
    op.drop_table('payments')
    op.drop_table('lots')
    op.drop_table('debt_contacts')
    op.drop_table('client_contacts')
    op.drop_table('tanks')
    op.drop_table('site_settings')
    op.drop_table('site_assignments')
    op.drop_table('press_lines')
    op.drop_table('payment_method_settings')
    op.drop_table('olive_varieties')
    op.drop_table('code_sequences')
    op.drop_table('clients')
    op.drop_table('boxes')
    op.drop_index('ix_audit_events_site_id_occurred_at', table_name='audit_events')
    op.drop_index('ix_audit_events_entity_type_entity_id', table_name='audit_events')
    op.drop_table('audit_events')
    op.drop_table('user_login_methods')
    op.drop_table('sites')
    op.drop_index('uq_seasons_single_open', table_name='seasons', postgresql_where=sa.text("status = 'open'"))
    op.drop_table('seasons')
    op.drop_table('one_time_codes')
    op.drop_table('invitations')
    op.drop_table('files')
    op.drop_table('credentials')
    op.drop_table('users')
    op.drop_table('cities')
    op.drop_table('provinces')
    op.execute('DROP TYPE IF EXISTS client_contact_title')
    op.execute('DROP TYPE IF EXISTS client_kind')
    op.execute('DROP TYPE IF EXISTS client_status')
    op.execute('DROP TYPE IF EXISTS client_title')
    op.execute('DROP TYPE IF EXISTS code_sequence_kind')
    op.execute('DROP TYPE IF EXISTS credential_kind')
    op.execute('DROP TYPE IF EXISTS credit_note_origin')
    op.execute('DROP TYPE IF EXISTS debt_contact_kind')
    op.execute('DROP TYPE IF EXISTS discount_entered_as')
    op.execute('DROP TYPE IF EXISTS discount_state')
    op.execute('DROP TYPE IF EXISTS file_bucket')
    op.execute('DROP TYPE IF EXISTS invitation_channel')
    op.execute('DROP TYPE IF EXISTS lot_mode')
    op.execute('DROP TYPE IF EXISTS lot_notification_choice')
    op.execute('DROP TYPE IF EXISTS lot_photo_step')
    op.execute('DROP TYPE IF EXISTS lot_status')
    op.execute('DROP TYPE IF EXISTS notification_channel')
    op.execute('DROP TYPE IF EXISTS notification_event')
    op.execute('DROP TYPE IF EXISTS notification_status')
    op.execute('DROP TYPE IF EXISTS one_time_code_channel')
    op.execute('DROP TYPE IF EXISTS one_time_code_purpose')
    op.execute('DROP TYPE IF EXISTS payment_method')
    op.execute('DROP TYPE IF EXISTS payment_method_setting_method')
    op.execute('DROP TYPE IF EXISTS payment_status')
    op.execute('DROP TYPE IF EXISTS pressing_pause_reason')
    op.execute('DROP TYPE IF EXISTS province_kind')
    op.execute('DROP TYPE IF EXISTS refund_method')
    op.execute('DROP TYPE IF EXISTS refund_origin')
    op.execute('DROP TYPE IF EXISTS refund_status')
    op.execute('DROP TYPE IF EXISTS season_status')
    op.execute('DROP TYPE IF EXISTS site_assignment_permission_permission')
    op.execute('DROP TYPE IF EXISTS site_setting_key')
    op.execute('DROP TYPE IF EXISTS site_status')
    op.execute('DROP TYPE IF EXISTS storage_draw_reason')
    op.execute('DROP TYPE IF EXISTS storage_owner')
    op.execute('DROP TYPE IF EXISTS user_language')
    op.execute('DROP TYPE IF EXISTS user_login_method_method')
    op.execute('DROP TYPE IF EXISTS user_role')
    op.execute('DROP TYPE IF EXISTS user_status')
    op.execute('DROP TYPE IF EXISTS user_title')
    op.execute('DROP TYPE IF EXISTS withdrawal_kind')
