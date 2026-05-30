from __future__ import annotations

from fastapi import APIRouter

from app.schemas.card_validation import CardValidationSchema

router = APIRouter(tags=["card-validation"])


@router.post("/payments/validate-card", status_code=200)
async def validate_card(body: CardValidationSchema) -> dict:
    """
    Kart bilgilerini Luhn, marka tespiti ve tarih kontrolüyle doğrular.
    Kart numarasının tamamı ve CVV response'a dahil edilmez.
    HTTP 422 hataları Pydantic tarafından otomatik yönetilir.
    """
    return {
        "valid": True,
        "brand": body.brand.value,
        "last_four": body.last_four,
    }
