"""add_payments_table

Revision ID: c3d4e5f6a7b8
Revises: 80cb41d10465
Create Date: 2026-05-30 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "80cb41d10465"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="TRY"),
        sa.Column(
            "status",
            sa.Enum("pending", "success", "failed", "refunded", name="payment_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "provider",
            sa.Enum("vakifbank", name="payment_provider"),
            nullable=False,
            server_default="vakifbank",
        ),
        sa.Column("provider_transaction_id", sa.String(255), nullable=True),
        sa.Column("card_last_four", sa.String(4), nullable=True),
        sa.Column("error_code", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("extra_data", sa.JSON, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("payments")
    # IF EXISTS + CASCADE: tablo silindikten sonra enum tipi kalmışsa temizle.
    # Başka bir tablo aynı enum'u kullanıyorsa CASCADE hata vermek yerine
    # o bağımlılığı da kaldırır — production'da dikkatli kullan.
    op.execute("DROP TYPE IF EXISTS payment_status CASCADE")
    op.execute("DROP TYPE IF EXISTS payment_provider CASCADE")
