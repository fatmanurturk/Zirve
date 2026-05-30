from __future__ import annotations

import logging

import httpx

from app.adapters.payment_gateway import ChargeRequest, ChargeResult, PaymentGatewayAdapter
from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# VakıfBank başarı kodu
_SUCCESS_CODE = "00"


class VakifBankAdapter(PaymentGatewayAdapter):
    """
    VakıfBank Sanal POS entegrasyonu.
    Farklı bir banka eklemek için PaymentGatewayAdapter'ı implement eden
    yeni bir sınıf yaz ve get_payment_gateway() factory'sini güncelle.
    """

    def __init__(self) -> None:
        self._api_url = settings.VAKIFBANK_API_URL
        self._api_key = settings.VAKIFBANK_API_KEY
        self._merchant_id = settings.VAKIFBANK_MERCHANT_ID

    async def charge(self, request: ChargeRequest) -> ChargeResult:
        # amount kuruşa çevrilir (1 TL = 100 kuruş) — bu dönüşüm adapter'a aittir
        amount_in_kurus = int(round(request.amount * 100))

        payload = {
            "MerchantId": self._merchant_id,
            "TerminalId": self._merchant_id,
            "ApiKey": self._api_key,
            "OrderId": request.reference_id,
            "Amount": amount_in_kurus,
            "Currency": request.currency,
            "CardNumber": request.card_number,
            "CardHolderName": request.card_holder_name,
            "ExpiryMonth": request.expiry_month,
            "ExpiryYear": request.expiry_year,
            "Cvv": request.cvv,
            "TransactionType": "Sale",
        }

        # Kart bilgilerini kesinlikle loglama
        logger.info(
            "VakıfBank charge isteği gönderiliyor | reference_id=%s amount_kurus=%d",
            request.reference_id,
            amount_in_kurus,
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self._api_url}/payment/sale",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                data: dict = response.json()
        except httpx.TimeoutException:
            logger.error("VakıfBank isteği zaman aşımına uğradı | reference_id=%s", request.reference_id)
            return ChargeResult(
                success=False,
                error_code="TIMEOUT",
                error_message="Ödeme servisi yanıt vermedi.",
            )
        except httpx.HTTPStatusError as exc:
            logger.error(
                "VakıfBank HTTP hatası | reference_id=%s status=%d",
                request.reference_id,
                exc.response.status_code,
            )
            return ChargeResult(
                success=False,
                error_code=f"HTTP_{exc.response.status_code}",
                error_message="Ödeme servisi beklenmedik bir hata döndürdü.",
            )
        except Exception as exc:
            logger.error("VakıfBank ağ hatası | reference_id=%s hata=%s", request.reference_id, exc)
            return ChargeResult(
                success=False,
                error_code="NETWORK_ERROR",
                error_message="Ödeme servisine ulaşılamadı.",
            )

        response_code: str = data.get("ResponseCode", "")
        if response_code == _SUCCESS_CODE:
            logger.info(
                "VakıfBank ödeme başarılı | reference_id=%s provider_tx=%s",
                request.reference_id,
                data.get("TransactionId"),
            )
            return ChargeResult(
                success=True,
                provider_transaction_id=data.get("TransactionId"),
            )

        logger.warning(
            "VakıfBank ödeme reddedildi | reference_id=%s code=%s msg=%s",
            request.reference_id,
            response_code,
            data.get("ResponseMessage"),
        )
        return ChargeResult(
            success=False,
            error_code=response_code,
            error_message=data.get("ResponseMessage", "Ödeme reddedildi."),
        )

    async def refund(self, provider_transaction_id: str, amount: float) -> ChargeResult:
        amount_in_kurus = int(round(amount * 100))

        payload = {
            "MerchantId": self._merchant_id,
            "ApiKey": self._api_key,
            "TransactionId": provider_transaction_id,
            "Amount": amount_in_kurus,
            "TransactionType": "Refund",
        }

        logger.info(
            "VakıfBank iade isteği gönderiliyor | provider_tx=%s amount_kurus=%d",
            provider_transaction_id,
            amount_in_kurus,
        )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self._api_url}/payment/refund",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                data = response.json()
        except Exception as exc:
            logger.error("VakıfBank iade hatası | provider_tx=%s hata=%s", provider_transaction_id, exc)
            return ChargeResult(
                success=False,
                error_code="REFUND_ERROR",
                error_message="İade işlemi sırasında bir hata oluştu.",
            )

        response_code = data.get("ResponseCode", "")
        if response_code == _SUCCESS_CODE:
            return ChargeResult(success=True, provider_transaction_id=data.get("TransactionId"))

        return ChargeResult(
            success=False,
            error_code=response_code,
            error_message=data.get("ResponseMessage", "İade reddedildi."),
        )


def get_payment_gateway() -> PaymentGatewayAdapter:
    """
    FastAPI Depends() ile inject edilecek factory.
    Farklı bir banka kullanmak için sadece bu fonksiyonu güncelle:
        return GarantiAdapter()
    """
    return VakifBankAdapter()
