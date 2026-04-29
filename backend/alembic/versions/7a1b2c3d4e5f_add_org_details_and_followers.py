"""Add org details and followers

Revision ID: 7a1b2c3d4e5f
Revises: df2c03417755
Create Date: 2026-04-29 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7a1b2c3d4e5f'
down_revision = '035b98ff77d9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to organizations
    op.add_column('organizations', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('organizations', sa.Column('category', sa.String(length=100), nullable=True))
    op.add_column('organizations', sa.Column('tags', sa.JSON(), server_default='[]', nullable=True))

    # Create organization_followers table
    op.create_table('organization_followers',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('organization_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organization_followers_id'), 'organization_followers', ['id'], unique=False)
    op.create_index(op.f('ix_organization_followers_organization_id'), 'organization_followers', ['organization_id'], unique=False)
    op.create_index(op.f('ix_organization_followers_user_id'), 'organization_followers', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop organization_followers table
    op.drop_index(op.f('ix_organization_followers_user_id'), table_name='organization_followers')
    op.drop_index(op.f('ix_organization_followers_organization_id'), table_name='organization_followers')
    op.drop_index(op.f('ix_organization_followers_id'), table_name='organization_followers')
    op.drop_table('organization_followers')

    # Drop columns from organizations
    op.drop_column('organizations', 'tags')
    op.drop_column('organizations', 'category')
    op.drop_column('organizations', 'city')
