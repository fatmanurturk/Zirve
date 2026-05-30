from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ChargeRequest:
    """Ödeme ağ geçidine gönderilen istek verisi."""
    reference_id: str          # Bizim UUID'imiz — idempotency için
    amount: float              # TL cinsinden (adapter kuruşa çevirir)
    currency: str
    card_number: str
    card_holder_name: str
    expiry_month: str          # MM
    expiry_year: str           # YYYY
    cvv: str


@dataclass
class ChargeResult:
    """Ödeme ağ geçidinden dönen sonuç."""
    success: bool
    provider_transaction_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class PaymentGatewayAdapter(ABC):
    """
    Tüm ödeme entegrasyonlarının uyması gereken sözleşme.
    Yeni bir banka eklemek için bu sınıfı implement et ve
    get_payment_gateway() factory'sini güncelle.
    """

    @abstractmethod
    async def charge(self, request: ChargeRequest) -> ChargeResult:
        """Kart tahsilatı gerçekleştir."""
        ...

    @abstractmethod
    async def refund(
        self,
        provider_transaction_id: str,
        amount: float,
    ) -> ChargeResult:
        """Daha önce yapılmış ödemeyi iade et."""
        ...
