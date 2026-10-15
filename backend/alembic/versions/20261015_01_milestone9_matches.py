"""Milestone 9: AI Matching and Recommendations table.

Revision ID: 20261015_01
Revises: 20261014_02
Create Date: 2026-10-15 11:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20261015_01'
down_revision: Union[str, None] = '20261014_02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'matches',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('lost_item_id', sa.String(length=50), nullable=False),
        sa.Column('found_item_id', sa.String(length=50), nullable=False),
        sa.Column('lost_user_id', sa.String(length=50), nullable=False),
        sa.Column('found_user_id', sa.String(length=50), nullable=False),
        sa.Column('overall_score', sa.Integer(), nullable=False),
        sa.Column('confidence_tier', sa.String(length=20), nullable=False),
        sa.Column('title_score', sa.Integer(), nullable=False),
        sa.Column('semantic_score', sa.Integer(), nullable=False),
        sa.Column('attribute_score', sa.Integer(), nullable=False),
        sa.Column('location_score', sa.Integer(), nullable=False),
        sa.Column('date_score', sa.Integer(), nullable=False),
        sa.Column('image_score', sa.Integer(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('reasons_json', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('feedback', sa.String(length=30), nullable=True),
        sa.Column('feedback_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['found_item_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['found_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lost_item_id'], ['items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lost_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lost_item_id', 'found_item_id', name='uq_lost_found_match'),
    )
    op.create_index(op.f('ix_matches_id'), 'matches', ['id'], unique=False)
    op.create_index(op.f('ix_matches_lost_item_id'), 'matches', ['lost_item_id'], unique=False)
    op.create_index(op.f('ix_matches_found_item_id'), 'matches', ['found_item_id'], unique=False)
    op.create_index(op.f('ix_matches_lost_user_id'), 'matches', ['lost_user_id'], unique=False)
    op.create_index(op.f('ix_matches_found_user_id'), 'matches', ['found_user_id'], unique=False)
    op.create_index(op.f('ix_matches_overall_score'), 'matches', ['overall_score'], unique=False)
    op.create_index(op.f('ix_matches_confidence_tier'), 'matches', ['confidence_tier'], unique=False)
    op.create_index(op.f('ix_matches_status'), 'matches', ['status'], unique=False)
    op.create_index(op.f('ix_matches_feedback'), 'matches', ['feedback'], unique=False)
    op.create_index(op.f('ix_matches_created_at'), 'matches', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_matches_created_at'), table_name='matches')
    op.drop_index(op.f('ix_matches_feedback'), table_name='matches')
    op.drop_index(op.f('ix_matches_status'), table_name='matches')
    op.drop_index(op.f('ix_matches_confidence_tier'), table_name='matches')
    op.drop_index(op.f('ix_matches_overall_score'), table_name='matches')
    op.drop_index(op.f('ix_matches_found_user_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_lost_user_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_found_item_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_lost_item_id'), table_name='matches')
    op.drop_index(op.f('ix_matches_id'), table_name='matches')
    op.drop_table('matches')
