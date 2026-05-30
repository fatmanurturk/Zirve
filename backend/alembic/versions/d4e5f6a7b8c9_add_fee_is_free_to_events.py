"""add_fee_is_free_to_events

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-30 11:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column(
            "fee",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="0.00",
        ),
    )
    op.add_column(
        "events",
        sa.Column(
            "is_free",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("events", "is_free")
    op.drop_column("events", "fee")
