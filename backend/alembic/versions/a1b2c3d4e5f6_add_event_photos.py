# filepath: backend/alembic/versions/20260510_add_event_photos.py
"""add event photos

Revision ID: a1b2c3d4e5f6
Revises: 7a1b2c3d4e5f
Create Date: 2026-05-10 10:57:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '7a1b2c3d4e5f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'event_photos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('caption', sa.String(length=255), nullable=True),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_cover', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_event_photos_event_id'), 'event_photos', ['event_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_event_photos_event_id'), table_name='event_photos')
    op.drop_table('event_photos')
