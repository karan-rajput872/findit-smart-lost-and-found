"""Persistent database schema upgrade for users, items, claims, and notifications.

Revision ID: 20261014_01
Revises: 20261011_01
Create Date: 2026-10-14 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20261014_01'
down_revision: Union[str, None] = '20261011_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update users table with password hash, avatar url, and string primary key
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('hashed_password', sa.String(length=255), nullable=False, server_default=''))
        batch_op.add_column(sa.Column('avatar_url', sa.String(length=500), nullable=True))
        batch_op.alter_column('id', type_=sa.String(length=50), existing_type=sa.Integer())

    # 2. Update items table with reporter contact details, is_demo flag, and string identifiers
    with op.batch_alter_table('items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('reporter_name', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('reporter_contact', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('is_demo', sa.Boolean(), server_default=sa.text('0'), nullable=False))
        batch_op.alter_column('id', type_=sa.String(length=50), existing_type=sa.Integer())
        batch_op.alter_column('report_type', new_column_name='type', type_=sa.String(length=20), existing_type=sa.String(length=20))
        batch_op.alter_column('item_date', new_column_name='date', type_=sa.String(length=30), existing_type=sa.Date())
        batch_op.alter_column('owner_id', new_column_name='user_id', type_=sa.String(length=50), existing_type=sa.Integer(), nullable=True)

    # 3. Update claims table with string identifiers
    with op.batch_alter_table('claims', schema=None) as batch_op:
        batch_op.alter_column('id', type_=sa.String(length=50), existing_type=sa.Integer())
        batch_op.alter_column('item_id', type_=sa.String(length=50), existing_type=sa.Integer())
        batch_op.alter_column('claimant_id', type_=sa.String(length=50), existing_type=sa.Integer())

    # 4. Update notifications table with string identifiers
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.alter_column('id', type_=sa.String(length=50), existing_type=sa.Integer())
        batch_op.alter_column('user_id', type_=sa.String(length=50), existing_type=sa.Integer())


def downgrade() -> None:
    # Reverse notifications
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.alter_column('user_id', type_=sa.Integer(), existing_type=sa.String(length=50))
        batch_op.alter_column('id', type_=sa.Integer(), existing_type=sa.String(length=50))

    # Reverse claims
    with op.batch_alter_table('claims', schema=None) as batch_op:
        batch_op.alter_column('claimant_id', type_=sa.Integer(), existing_type=sa.String(length=50))
        batch_op.alter_column('item_id', type_=sa.Integer(), existing_type=sa.String(length=50))
        batch_op.alter_column('id', type_=sa.Integer(), existing_type=sa.String(length=50))

    # Reverse items
    with op.batch_alter_table('items', schema=None) as batch_op:
        batch_op.alter_column('user_id', new_column_name='owner_id', type_=sa.Integer(), existing_type=sa.String(length=50), nullable=False)
        batch_op.alter_column('date', new_column_name='item_date', type_=sa.Date(), existing_type=sa.String(length=30))
        batch_op.alter_column('type', new_column_name='report_type', type_=sa.String(length=20), existing_type=sa.String(length=20))
        batch_op.alter_column('id', type_=sa.Integer(), existing_type=sa.String(length=50))
        batch_op.drop_column('is_demo')
        batch_op.drop_column('reporter_contact')
        batch_op.drop_column('reporter_name')

    # Reverse users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('id', type_=sa.Integer(), existing_type=sa.String(length=50))
        batch_op.drop_column('avatar_url')
        batch_op.drop_column('hashed_password')
