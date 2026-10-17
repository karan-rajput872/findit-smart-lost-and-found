"""Milestone 10: Google Identity Services authentication support.

Revision ID: 20261017_01
Revises: 20261015_01
Create Date: 2026-10-17 11:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20261017_01'
down_revision: Union[str, None] = '20261015_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('google_sub', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('auth_provider', sa.String(length=30), nullable=False, server_default='local'))
        batch_op.alter_column('hashed_password', existing_type=sa.String(length=255), nullable=True)
        batch_op.create_index(op.f('ix_users_google_sub'), ['google_sub'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(op.f('ix_users_google_sub'))
        batch_op.alter_column('hashed_password', existing_type=sa.String(length=255), nullable=False)
        batch_op.drop_column('auth_provider')
        batch_op.drop_column('google_sub')
