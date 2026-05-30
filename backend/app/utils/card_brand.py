from __future__ import annotations

import re
from enum import Enum


class CardBrand(str, Enum):
    VISA = "VISA"
    MASTERCARD = "MASTERCARD"
    TROY = "TROY"
    AMEX = "AMEX"
    UNKNOWN = "UNKNOWN"


# Sıralama kritik:
#   - Troy ^9792 önce gelir (Visa ^4 ile çakışmaz, ama alışkanlık olarak önce özel BIN'ler)
#   - Amex ^3[47] önce gelir (Visa ^4 geniş; Amex'in 3 ile başladığı için çakışmaz)
#   - Visa ve Mastercard en sona
_BRAND_PATTERNS: list[tuple[CardBrand, re.Pattern]] = [
    (CardBrand.TROY,       re.compile(r"^9792")),
    (CardBrand.AMEX,       re.compile(r"^3[47]")),
    (CardBrand.MASTERCARD, re.compile(r"^5[1-5]|^2[2-7]")),
    (CardBrand.VISA,       re.compile(r"^4")),
]


def detect_card_brand(card_number: str) -> CardBrand:
    """
    BIN (Bank Identification Number) prefix regex'leriyle kart markasını tespit eder.
    Eşleşme bulunamazsa CardBrand.UNKNOWN döner.
    """
    cleaned = card_number.replace(" ", "").replace("-", "")

    for brand, pattern in _BRAND_PATTERNS:
        if pattern.match(cleaned):
            return brand

    return CardBrand.UNKNOWN
