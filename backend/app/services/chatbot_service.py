from __future__ import annotations

import json
from datetime import datetime as _dt
from typing import Any

import httpx

from app.core.config import get_settings

settings = get_settings()

_CITIES = [
    "ankara", "istanbul", "izmir", "bursa", "antalya", "gaziantep",
    "konya", "kayseri", "adana", "erzurum", "eskişehir", "mersin",
    "van", "diyarbakır", "şırnak", "muş", "bitlis", "trabzon",
    "samsun", "malatya", "elazığ", "kahramanmaraş", "hatay", "ağrı",
    "artvin", "rize", "kastamonu", "bolu", "afyon", "denizli",
]

_ACTIVITIES = [
    "hiking", "trekking", "dağcılık", "kamp", "rafting", "kayak",
    "paragliding", "paraşüt", "mountain bike", "bisiklet", "kaya tırmanış",
    "doğa yürüyüşü", "yürüyüş", "tırmanış", "çevre", "kurtarma",
]

# Zorluk seviyesi anahtar kelimeleri → normalize değer
_DIFFICULTY_KEYWORDS: dict[str, str] = {
    "başlangıç": "easy",
    "başlangıç seviyesi": "easy",
    "kolay": "easy",
    "yeni başlayan": "easy",
    "acemi": "easy",
    "orta": "medium",
    "orta seviye": "medium",
    "orta zorluk": "medium",
    "zor": "hard",
    "zorlu": "hard",
    "ileri": "hard",
    "ileri seviye": "hard",
    "uzman": "expert",
    "profesyonel": "expert",
    "deneyimli": "expert",
}


def _extract_difficulty(msg: str) -> str | None:
    msg_lower = msg.lower()
    for kw, level in sorted(_DIFFICULTY_KEYWORDS.items(), key=lambda x: -len(x[0])):
        if kw in msg_lower:
            return level
    return None


def _simple_intent_extraction(user_message: str) -> dict[str, Any]:
    msg = user_message.lower()
    city = next((c.capitalize() for c in _CITIES if c in msg), None)
    activity = next((a.capitalize() for a in _ACTIVITIES if a in msg), None)
    difficulty = _extract_difficulty(msg)
    return {"city": city, "activity": activity, "difficulty": difficulty}


async def extract_intent(user_message: str) -> dict[str, Any]:
    if not settings.GROQ_API_KEY:
        return _simple_intent_extraction(user_message)

    prompt = (
        "Aşağıdaki kullanıcı sorusundan şehir, etkinlik türü ve zorluk seviyesini çıkar. "
        "SADECE JSON formatında yanıt ver, başka hiçbir şey yazma:\n"
        '{"city": "şehir adı veya null", "activity": "etkinlik türü veya null", '
        '"difficulty": "easy/medium/hard/expert veya null"}\n\n'
        "Zorluk eşleşmeleri: başlangıç/kolay/acemi → easy, orta → medium, "
        "zor/zorlu/ileri → hard, uzman/profesyonel/deneyimli → expert\n\n"
        f"Soru: {user_message}"
    )
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "Sen yalnızca JSON döndüren bir NLP aracısın. Hiçbir açıklama yapma."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.0,
        "max_tokens": 128,
    }
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {settings.GROQ_API_KEY}"}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(settings.GROQ_API_URL, json=payload, headers=headers, timeout=15.0)
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            # JSON bloğunu çıkar
            if "```" in raw:
                raw = raw.split("```")[1].lstrip("json").strip()
            parsed = json.loads(raw)
            result = {
                "city": parsed.get("city") or None,
                "activity": parsed.get("activity") or None,
                "difficulty": parsed.get("difficulty") or None,
            }
            # Groq "null" string döndürebilir
            for k in result:
                if result[k] in ("null", "None", ""):
                    result[k] = None
            # Groq başaramazsa fallback'ten difficulty al
            if result["difficulty"] is None:
                result["difficulty"] = _extract_difficulty(user_message)
            return result
        except Exception:
            return _simple_intent_extraction(user_message)


def _tr_date(dt: _dt) -> str:
    months = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
              "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
    return f"{dt.day} {months[dt.month]} {dt.year}"


def _build_template_response(
    user_message: str,
    city: str | None,
    activity: str | None,
    difficulty: str | None,
    events: list[dict],
) -> str:
    city_cap = city.capitalize() if city else None
    activity_str = f" {activity.lower()}" if activity else ""

    _difficulty_label = {
        "easy": "başlangıç/kolay",
        "medium": "orta seviye",
        "hard": "zorlu",
        "expert": "uzman seviyesi",
    }
    diff_str = f" ({_difficulty_label.get(difficulty, '')})" if difficulty else ""

    location_str = city_cap or "platform genelinde"

    if not events:
        if city_cap and difficulty:
            return (
                f"{city_cap} bölgesinde{activity_str}{diff_str} kriterlere uyan etkinlik "
                "şu an platformumuzda bulunmuyor. Farklı tarih veya farklı zorluk seviyesini de deneyebilirsin!"
            )
        if city_cap:
            return (
                f"{city_cap} bölgesinde{activity_str} arama yaptık, "
                "ancak önümüzdeki dönemde uygun etkinlik bulunamadı. "
                "Etkinlikler sürekli güncelleniyor, daha sonra tekrar bakabilirsin!"
            )
        if difficulty:
            return (
                f"{_difficulty_label.get(difficulty, difficulty).capitalize()} seviyesinde{activity_str} "
                "etkinlik şu an platformumuzda açık değil. "
                "Farklı zorluktaki etkinlikleri de incelemek ister misin?"
            )
        return (
            f"{location_str}{activity_str} için uygun etkinlik şu an bulunamadı. "
            "Yeni etkinlikler sürekli ekleniyor, kısa süre içinde tekrar kontrol edebilirsin!"
        )

    if len(events) == 1:
        e = events[0]
        try:
            dt = _dt.fromisoformat(e["start_date"].replace("Z", "+00:00"))
            date_str = _tr_date(dt)
        except Exception:
            date_str = e["start_date"][:10]
        loc = e.get("location_name") or city_cap or "belirtilen konum"
        return (
            f"{'Harika! ' if not difficulty else ''}"
            f"{location_str.capitalize()} için{activity_str}{diff_str} 1 etkinlik bulundu:\n\n"
            f"📌 **{e['title']}**\n"
            f"📅 {date_str}\n"
            f"📍 {loc}\n"
            f"⚡ Zorluk: {e.get('difficulty', '-')}\n\n"
            "Detaylar ve başvuru için etkinlik sayfasını inceleyebilirsin!"
        )

    lines = []
    for e in events[:4]:
        try:
            dt = _dt.fromisoformat(e["start_date"].replace("Z", "+00:00"))
            date_str = _tr_date(dt)
        except Exception:
            date_str = e["start_date"][:10]
        lines.append(f"• **{e['title']}** — {date_str} · {e.get('location_name', '')} · {e.get('difficulty', '')}")

    more = f"\n\n...ve {len(events) - 4} etkinlik daha!" if len(events) > 4 else ""
    return (
        f"{location_str.capitalize()} için{activity_str}{diff_str} {len(events)} etkinlik bulundu:\n\n"
        + "\n".join(lines)
        + more
        + "\n\nTüm detaylar ve başvuru için etkinlik sayfalarını inceleyebilirsin."
    )


async def generate_search_response(
    user_message: str,
    city: str | None,
    activity: str | None,
    difficulty: str | None,
    events: list[dict],
) -> str:
    if not settings.GROQ_API_KEY:
        return _build_template_response(user_message, city, activity, difficulty, events)

    if events:
        event_lines = "\n".join(
            f"- {e['title']} | Tarih: {e['start_date'][:10]} | "
            f"Konum: {e.get('location_name') or 'Belirtilmemiş'} | "
            f"Tür: {e.get('category', '')} | Zorluk: {e.get('difficulty', '')}"
            for e in events[:5]
        )
        context = f"Eşleşen etkinlikler ({len(events)} adet):\n{event_lines}"
    else:
        context = "Arama yapıldı fakat kriterlere uyan etkinlik bulunamadı."

    _diff_label = {
        "easy": "başlangıç/kolay", "medium": "orta", "hard": "zorlu", "expert": "uzman"
    }
    search_summary_parts = []
    if city:
        search_summary_parts.append(f"Şehir: {city}")
    if activity:
        search_summary_parts.append(f"Etkinlik türü: {activity}")
    if difficulty:
        search_summary_parts.append(f"Zorluk: {_diff_label.get(difficulty, difficulty)}")
    search_summary = ", ".join(search_summary_parts) if search_summary_parts else "Genel arama"

    prompt = (
        f'Kullanıcının sorusu: "{user_message}"\n'
        f"Arama parametreleri: {search_summary}\n\n"
        f"{context}\n\n"
        "Kullanıcıya samimi, doğal Türkçe ile 2-4 cümlelik bir yanıt ver. "
        "Etkinlik bulunduysa tarih, konum ve zorluk bilgilerini vurgula. "
        "Etkinlik bulunamadıysa neden bulunamadığını kısaca açıkla ve "
        "farklı tarih veya farklı zorluk seviyesi denemesini öner. "
        "Emoji kullanabilirsin. "
        "KESİNLİKLE listede olmayan, uydurma etkinlik adı, şehir veya tarih YAZMA. "
        "Sadece yukarıda verilen gerçek etkinlik verileriyle yanıt ver."
    )

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Sen Zirve'nin doğa sporları asistanısın. "
                    "Kullanıcıya her soruda farklı, kişiselleştirilmiş Türkçe yanıtlar üretirsin. "
                    "Tekrar eden kalıplardan kaçın. Sıcak, samimi ve bilgilendirici ol."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.8,
        "max_tokens": 400,
    }
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {settings.GROQ_API_KEY}"}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(settings.GROQ_API_URL, json=payload, headers=headers, timeout=20.0)
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            if text:
                return text
        except Exception:
            pass

    return _build_template_response(user_message, city, activity, difficulty, events)


_MODE_INSTRUCTIONS: dict[str, str] = {
    "general": "Genel Zirve platformu asistanısın. Etkinlikler, gönüllülük ve doğa sporları hakkında yardımcı ol.",
    "events": "Etkinlik uzmanısın. Etkinlik oluşturma, yönetme, tarih/konum planlama konularında odaklan.",
    "volunteers": "Gönüllü koordinatörüsün. Gönüllü bulma, eşleştirme, kapasite planlama konularında odaklan.",
    "reports": "Veri analistsin. İstatistik, rapor ve analiz konularında odaklan. Tabloları markdown formatında ver.",
}


async def generate_full_chat_response(
    user_message: str,
    mode: str,
    history: list[dict],
    system_context: str,
) -> str:
    mode_instruction = _MODE_INSTRUCTIONS.get(mode, _MODE_INSTRUCTIONS["general"])
    system_prompt = (
        f"Sen Zirve doğa sporları platformunun AI asistanısın. {mode_instruction}\n\n"
        "Türkçe, samimi ve bilgilendirici yanıtlar ver. "
        "Markdown formatı kullanabilirsin (başlık, liste, kalın). "
        "Emoji kullanabilirsin ama aşırıya kaçma.\n\n"
        f"Kullanıcı bağlamı:\n{system_context}"
        if system_context else
        f"Sen Zirve doğa sporları platformunun AI asistanısın. {mode_instruction}\n"
        "Türkçe, samimi ve bilgilendirici yanıtlar ver. Markdown formatı kullanabilirsin."
    )

    if not settings.GROQ_API_KEY:
        return f"Şu an AI servisi aktif değil. Mesajınız: «{user_message}»"

    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:  # son 10 mesaj ile sınırla
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "temperature": 0.75,
        "max_tokens": 700,
    }
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {settings.GROQ_API_KEY}"}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(settings.GROQ_API_URL, json=payload, headers=headers, timeout=25.0)
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            if text:
                return text
        except Exception:
            pass

    return "Bir sorun oluştu, lütfen tekrar deneyin."


async def generate_recommendation_text(user_summary: str, events: list[dict]) -> str:
    if not events:
        return "Profilinize uygun açık etkinlik bulunamadı."

    if not settings.GROQ_API_KEY:
        names = [e["title"] for e in events[:3]]
        return f"Profilinize göre en uygun etkinlikler: {', '.join(names)}."

    event_lines = "\n".join(
        f"- {e['title']} (Tür: {e['category']}, Zorluk: {e['difficulty']}, "
        f"Konum: {e.get('location_name') or 'Belirtilmemiş'}, "
        f"Uyum skoru: %{round(e.get('match_score', 0) * 100)})"
        for e in events[:5]
    )
    prompt = (
        f"Gönüllü profili:\n{user_summary}\n\n"
        f"Profil analizine göre önerilen etkinlikler:\n{event_lines}\n\n"
        "Bu kişiye neden bu etkinliklerin uygun olduğunu 2-3 cümleyle, "
        "samimi ve teşvik edici Türkçe ile açıkla. En yüksek uyumlu etkinliği özellikle vurgula."
    )

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "Sen Zirve platformunun kişisel doğa sporları koçusun. Türkçe, samimi ve motive edici konuş."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 300,
    }
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {settings.GROQ_API_KEY}"}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(settings.GROQ_API_URL, json=payload, headers=headers, timeout=20.0)
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            if text:
                return text
        except Exception:
            pass

    names = [e["title"] for e in events[:3]]
    return f"Profilinize göre en uygun etkinlikler: {', '.join(names)}."
