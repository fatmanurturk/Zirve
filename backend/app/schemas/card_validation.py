from __future__ import annotations

import re
from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Self

from app.utils.card_brand import CardBrand, detect_card_brand
from app.utils.luhn import luhn_check

# Türkçe karakterler dahil yalnızca harf ve boşluk
_NAME_RE = re.compile(r"^[a-zA-ZğüşıöçĞÜŞİÖÇ ]+$")


class CardValidationSchema(BaseModel):

    card_number: str = Field(..., description="Kart numarası (boşluk/tire kabul edilir)")
    card_holder_name: str = Field(..., min_length=3, description="Kart üzerindeki ad soyad")
    expiry_month: str = Field(..., description="Son kullanma ayı (MM)")
    expiry_year: str = Field(..., description="Son kullanma yılı (YYYY)")
    cvv: str = Field(..., description="CVV / CVC kodu")

    # ── Alan bazlı validasyonlar ──────────────────────────────

    @field_validator("card_number", mode="before")
    @classmethod
    def validate_card_number(cls, v: str) -> str:
        cleaned = str(v).replace(" ", "").replace("-", "")
        if not cleaned.isdigit():
            raise ValueError("Kart numarası yalnızca rakamlardan oluşmalıdır.")
        if not (13 <= len(cleaned) <= 19):
            raise ValueError("Kart numarası 13-19 hane arasında olmalıdır.")
        if not luhn_check(cleaned):
            raise ValueError("Geçersiz kart numarası.")
        return cleaned  # Normalize edilmiş (sadece rakam) hali saklanır

    @field_validator("card_holder_name", mode="before")
    @classmethod
    def validate_card_holder_name(cls, v: str) -> str:
        name = str(v).strip()
        if len(name) < 3:
            raise ValueError("Kart sahibi adı en az 3 karakter olmalıdır.")
        if not _NAME_RE.match(name):
            raise ValueError("Kart sahibi adı yalnızca harf ve boşluk içerebilir.")
        return name.upper()

    @field_validator("expiry_month", mode="before")
    @classmethod
    def validate_expiry_month(cls, v: str) -> str:
        raw = str(v).strip()
        if not raw.isdigit():
            raise ValueError("Son kullanma ayı yalnızca rakamlardan oluşmalıdır.")
        month = int(raw)
        if not (1 <= month <= 12):
            raise ValueError("Son kullanma ayı 1-12 arasında olmalıdır.")
        return str(month).zfill(2)  # "3" → "03"

    @field_validator("expiry_year", mode="before")
    @classmethod
    def validate_expiry_year(cls, v: str) -> str:
        raw = str(v).strip()
        if not raw.isdigit():
            raise ValueError("Son kullanma yılı yalnızca rakamlardan oluşmalıdır.")
        year = int(raw)
        current_year = datetime.now(timezone.utc).year
        if year < current_year:
            raise ValueError("Son kullanma yılı geçmişte olamaz.")
        if year > current_year + 20:
            raise ValueError("Son kullanma yılı çok ileri bir tarihi gösteriyor.")
        return raw

    @field_validator("cvv", mode="before")
    @classmethod
    def validate_cvv_format(cls, v: str) -> str:
        raw = str(v).strip()
        if not raw.isdigit():
            raise ValueError("CVV yalnızca rakamlardan oluşmalıdır.")
        if len(raw) not in (3, 4):
            raise ValueError("CVV 3 veya 4 haneli olmalıdır.")
        return raw

    # ── Çapraz alan validasyonları ────────────────────────────

    @model_validator(mode="after")
    def cross_field_checks(self) -> Self:
        now = datetime.now(timezone.utc)

        # 1. Son kullanma tarihi: ay + yıl birlikte kontrol
        try:
            month = int(self.expiry_month)
            year = int(self.expiry_year)
            # O ayın son gününü değil, ayın başını karşılaştır
            # Kartın ay başında hâlâ geçerli olduğu kabul edilir
            expiry = datetime(year, month, 1, tzinfo=timezone.utc)
            if expiry < datetime(now.year, now.month, 1, tzinfo=timezone.utc):
                raise ValueError("Kartın son kullanma tarihi geçmiş.")
        except ValueError as exc:
            # datetime() constructor'ından gelen ValueError'u yakala
            if "son kullanma" in str(exc).lower() or "expired" in str(exc).lower() or "geçmiş" in str(exc).lower():
                raise
            raise ValueError("Geçersiz son kullanma tarihi.") from exc

        # 2. CVV uzunluğu — marka tespitinden SONRA kontrol edilir
        brand = detect_card_brand(self.card_number)
        if brand == CardBrand.AMEX:
            if len(self.cvv) != 4:
                raise ValueError("AMEX kartlar için CVV 4 haneli olmalıdır.")
        else:
            if len(self.cvv) != 3:
                raise ValueError("CVV 3 haneli olmalıdır.")

        return self

    # ── Computed alanlar ──────────────────────────────────────

    @property
    def brand(self) -> CardBrand:
        """Kart markasını döndürür."""
        return detect_card_brand(self.card_number)

    @property
    def last_four(self) -> str:
        """Kart numarasının son 4 hanesini döndürür."""
        return self.card_number[-4:]
