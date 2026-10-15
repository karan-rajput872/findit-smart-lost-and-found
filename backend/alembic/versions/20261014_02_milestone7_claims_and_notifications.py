"""Milestone 7: Claims and Notifications schema expansion.

Revision ID: 20261014_02
Revises: 20261014_01
Create Date: 2026-10-14 13:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20261014_02'
down_revision: Union[str, None] = '20261014_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update claims table with item_owner_id, proof_details, review_notes, handover columns
    with op.batch_alter_table('claims', schema=None) as batch_op:
        batch_op.add_column(sa.Column('item_owner_id', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('proof_details', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('review_notes', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('handover_status', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('handover_details', sa.Text(), nullable=True))
        batch_op.create_foreign_key(
            'fk_claims_item_owner_id_users',
            'users',
            ['item_owner_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_index(batch_op.f('ix_claims_item_owner_id'), ['item_owner_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_claims_handover_status'), ['handover_status'], unique=False)

    # 2. Update notifications table with item_id and claim_id references
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.add_column(sa.Column('item_id', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('claim_id', sa.String(length=50), nullable=True))
        batch_op.create_foreign_key(
            'fk_notifications_item_id_items',
            'items',
            ['item_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_foreign_key(
            'fk_notifications_claim_id_claims',
            'claims',
            ['claim_id'],
            ['id'],
            ondelete='SET NULL',
        )
        batch_op.create_index(batch_op.f('ix_notifications_item_id'), ['item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_claim_id'), ['claim_id'], unique=False)


def downgrade() -> None:
    # 1. Reverse notifications table
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_claim_id'))
        batch_op.drop_index(batch_op.f('ix_notifications_item_id'))
        batch_op.drop_constraint('fk_notifications_claim_id_claims', type_='foreignkey')
        batch_op.drop_constraint('fk_notifications_item_id_items', type_='foreignkey')
        batch_op.drop_column('claim_id')
        batch_op.drop_column('item_id')

    # 2. Reverse claims table
    with op.batch_alter_table('claims', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_claims_handover_status'))
        batch_op.drop_index(batch_op.f('ix_claims_item_owner_id'))
        batch_op.drop_constraint('fk_claims_item_owner_id_users', type_='foreignkey')
        batch_op.drop_column('handover_details')
        batch_op.drop_column('handover_status')
        batch_op.drop_column('review_notes')
        batch_op.drop_column('proof_details')
        batch_op.drop_column('item_owner_id')
