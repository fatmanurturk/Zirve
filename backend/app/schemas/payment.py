from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.payment import PaymentProvider, PaymentStatus


class CreatePaymentDto(BaseModel):
    amount: float = Field(..., gt=0, description="Ödeme tutarı (TL)")
    currency: str = Field(default="TRY", min_length=3, max_length=3)
    card_number: str = Field(..., min_length=16, max_length=16)
    card_holder_name: str = Field(..., min_length=1)
    expiry_month: str = Field(..., pattern=r"^\d{2}$", description="MM formatı")
    expiry_year: str = Field(..., pattern=r"^\d{4}$", description="YYYY formatı")
    cvv: str = Field(..., min_length=3, max_length=4)
    extra_data: Optional[dict] = None

    @field_validator("card_number")
    @classmethod
    def card_number_must_be_digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Kart numarası yalnızca rakamlardan oluşmalıdır.")
        return v

    @field_validator("amount")
    @classmethod
    def amount_max_two_decimals(cls, v: float) -> float:
        if round(v, 2) != v:
            raise ValueError("Tutar en fazla 2 ondalık basamak içerebilir.")
        return v


class PaymentResponseDto(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: float
    currency: str
    status: PaymentStatus
    provider: PaymentProvider
    provider_transaction_id: Optional[str]
    card_last_four: Optional[str]
    error_code: Optional[str]
    error_message: Optional[str]
    extra_data: Optional[dict]
    created_at: datetime


class RefundPaymentDto(BaseModel):
    amount: float = Field(..., gt=0, description="İade tutarı (TL)")
