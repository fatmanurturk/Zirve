from __future__ import annotations


def luhn_check(card_number: str) -> bool:
    """
    Luhn algoritması ile kart numarasını doğrular.
    Exception fırlatmaz — geçerli ise True, değilse False döner.

    Adımlar:
      1. Boşluk ve tire karakterlerini temizle.
      2. Yalnızca rakamlardan oluşup oluşmadığını kontrol et.
      3. 13-19 hane arası uzunluk kontrolü yap.
      4. Sağdan sola rakamları işle:
           - Sağdan 1., 3., 5. ... pozisyonlar (tek indeks): doğrudan al.
           - Sağdan 2., 4., 6. ... pozisyonlar (çift indeks): ikiye katla.
             İkiye katlama sonucu 9'u aşıyorsa 9 çıkar.
      5. Tüm rakamları topla.
      6. Toplam 10'a tam bölünüyorsa kart numarası geçerlidir.
    """
    # Adım 1: Normalize et
    cleaned = card_number.replace(" ", "").replace("-", "")

    # Adım 2: Sadece rakam olup olmadığını kontrol et
    if not cleaned.isdigit():
        return False

    # Adım 3: Uzunluk kontrolü
    if not (13 <= len(cleaned) <= 19):
        return False

    # Adım 4: Luhn hesaplaması
    total = 0
    reverse_digits = cleaned[::-1]  # Sağdan sola okumak için ters çevir

    for i, digit_char in enumerate(reverse_digits):
        digit = int(digit_char)

        if i % 2 == 1:
            # Çift indeks (sağdan 2., 4., ...): ikiye katla
            digit *= 2
            if digit > 9:
                digit -= 9

        total += digit

    # Adım 5-6: Toplam 10'a tam bölünüyorsa geçerli
    return total % 10 == 0
