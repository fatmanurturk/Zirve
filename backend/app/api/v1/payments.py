from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.payment_gateway import PaymentGatewayAdapter
from app.adapters.vakifbank_adapter import get_payment_gateway
from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.payment import CreatePaymentDto, PaymentResponseDto, RefundPaymentDto
from app.services.payment_service import PaymentService

router = APIRouter(tags=["payments"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]
GatewayDep = Annotated[PaymentGatewayAdapter, Depends(get_payment_gateway)]


@router.post("/payments", response_model=PaymentResponseDto, status_code=status.HTTP_201_CREATED)
async def process_payment(
    dto: CreatePaymentDto,
    db: DbSessionDep,
    current_user: CurrentUserDep,
    gateway: GatewayDep,
) -> PaymentResponseDto:
    try:
        return await PaymentService(db, gateway).process_payment(dto)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(e))


@router.get("/payments", response_model=list[PaymentResponseDto], status_code=status.HTTP_200_OK)
async def list_payments(
    db: DbSessionDep,
    current_user: CurrentUserDep,
    gateway: GatewayDep,
) -> list[PaymentResponseDto]:
    payments = await PaymentService(db, gateway).get_all()
    return [PaymentResponseDto.model_validate(p) for p in payments]


@router.get("/payments/{payment_id}", response_model=PaymentResponseDto, status_code=status.HTTP_200_OK)
async def get_payment(
    payment_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
    gateway: GatewayDep,
) -> PaymentResponseDto:
    payment = await PaymentService(db, gateway).get_by_id(payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ödeme bulunamadı.")
    return PaymentResponseDto.model_validate(payment)


@router.post("/payments/{payment_id}/refund", response_model=PaymentResponseDto, status_code=status.HTTP_200_OK)
async def refund_payment(
    payment_id: UUID,
    dto: RefundPaymentDto,
    db: DbSessionDep,
    current_user: CurrentUserDep,
    gateway: GatewayDep,
) -> PaymentResponseDto:
    try:
        return await PaymentService(db, gateway).refund_payment(payment_id, dto)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
