from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.payment_gateway import ChargeRequest, PaymentGatewayAdapter
from app.models.payment import Payment, PaymentProvider, PaymentStatus
from app.schemas.payment import CreatePaymentDto, PaymentResponseDto, RefundPaymentDto

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, db: AsyncSession, gateway: PaymentGatewayAdapter) -> None:
        self.db = db
        self.gateway = gateway

    async def process_payment(self, dto: CreatePaymentDto) -> PaymentResponseDto:
        # 1. PENDING kaydı VakıfBank isteğinden ÖNCE oluşturulur.
        #    Ağ hatası olsa bile kayıt veritabanında kalır.
        payment = Payment(
            amount=dto.amount,
            currency=dto.currency,
            status=PaymentStatus.PENDING,
            provider=PaymentProvider.VAKIFBANK,
            card_last_four=dto.card_number[-4:],  # Sadece son 4 hane
            extra_data=dto.extra_data,
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)

        logger.info("Ödeme kaydı oluşturuldu | payment_id=%s", payment.id)

        # 2. Gateway'e istek at (kart numarası loglanmaz)
        charge_request = ChargeRequest(
            reference_id=str(payment.id),
            amount=dto.amount,
            currency=dto.currency,
            card_number=dto.card_number,
            card_holder_name=dto.card_holder_name,
            expiry_month=dto.expiry_month,
            expiry_year=dto.expiry_year,
            cvv=dto.cvv,
        )
        result = await self.gateway.charge(charge_request)

        # 3. Sonuca göre kaydı güncelle
        if result.success:
            payment.status = PaymentStatus.SUCCESS
            payment.provider_transaction_id = result.provider_transaction_id
            logger.info("Ödeme başarılı | payment_id=%s provider_tx=%s", payment.id, result.provider_transaction_id)
        else:
            payment.status = PaymentStatus.FAILED
            payment.error_code = result.error_code
            payment.error_message = result.error_message
            logger.warning("Ödeme başarısız | payment_id=%s code=%s", payment.id, result.error_code)

        await self.db.commit()
        await self.db.refresh(payment)

        # 4. Başarısız ödemelerde service ValueError fırlatır → endpoint HTTPException'a çevirir
        if not result.success:
            raise ValueError(result.error_message or "Ödeme işlemi başarısız.")

        return PaymentResponseDto.model_validate(payment)

    async def refund_payment(self, payment_id: UUID, dto: RefundPaymentDto) -> PaymentResponseDto:
        payment = await self.db.scalar(select(Payment).where(Payment.id == payment_id))
        if payment is None:
            raise ValueError("Ödeme bulunamadı.")
        if payment.status != PaymentStatus.SUCCESS:
            raise ValueError("Yalnızca başarılı ödemeler iade edilebilir.")
        if not payment.provider_transaction_id:
            raise ValueError("Bu ödeme için sağlayıcı referansı bulunamadı.")
        if dto.amount > float(payment.amount):
            raise ValueError("İade tutarı ödeme tutarından büyük olamaz.")

        result = await self.gateway.refund(payment.provider_transaction_id, dto.amount)

        if result.success:
            payment.status = PaymentStatus.REFUNDED
            payment.provider_transaction_id = result.provider_transaction_id or payment.provider_transaction_id
        else:
            raise ValueError(result.error_message or "İade işlemi başarısız.")

        await self.db.commit()
        await self.db.refresh(payment)
        return PaymentResponseDto.model_validate(payment)

    async def get_by_id(self, payment_id: UUID) -> Payment | None:
        return await self.db.scalar(select(Payment).where(Payment.id == payment_id))

    async def get_all(self) -> list[Payment]:
        result = await self.db.execute(select(Payment).order_by(Payment.created_at.desc()))
        return list(result.scalars().all())
