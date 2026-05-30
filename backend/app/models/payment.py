from __future__ import annotations

import enum
from typing import Optional

from sqlalchemy import Enum, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import BaseModel


class PaymentStatus(enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentProvider(enum.Enum):
    VAKIFBANK = "vakifbank"


class Payment(BaseModel):
    __tablename__ = "payments"

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="TRY")

    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(PaymentProvider, name="payment_provider"),
        nullable=False,
        default=PaymentProvider.VAKIFBANK,
    )

    # VakıfBank'tan dönen referans numarası
    provider_transaction_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # PCI-DSS: tam kart numarası saklanmaz
    card_last_four: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)

    # Başarısız işlemlerde dolar
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # orderId, userId gibi uygulama bağlamı
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
