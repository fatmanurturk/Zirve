from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.application import Application, ApplicationStatus
from app.models.event import Event, EventCategory, EventDifficulty, EventStatus
from app.models.organization import Organization
from app.models.user import User
from app.models.volunteer import VolunteerProfile

# ---------- Çeviri sabitleri ----------

_EXPERIENCE_TR = {
    "beginner": "Başlangıç",
    "intermediate": "Orta",
    "expert": "Uzman",
}

_EQUIPMENT_TR = {
    "helmet": "kask",
    "crampon": "krampon",
    "rope": "ip",
    "sleeping_bag": "uyku tulumu",
    "tent": "çadır",
    "harness": "emniyet kemeri",
    "other": "diğer ekipman",
}

_CATEGORY_TR = {
    "hiking": "doğa yürüyüşü",
    "climbing": "tırmanış",
    "environment": "çevre",
    "rescue": "kurtarma",
    "other": "diğer",
}

_DIFFICULTY_TR = {
    "easy": "Kolay",
    "medium": "Orta",
    "hard": "Zor",
    "expert": "Uzman",
}

_DIFFICULTY_TO_ENUM: dict[str, list[EventDifficulty]] = {
    "easy":   [EventDifficulty.EASY],
    "medium": [EventDifficulty.MEDIUM],
    "hard":   [EventDifficulty.HARD],
    "expert": [EventDifficulty.EXPERT],
}

_ACTIVITY_TO_CATEGORY: dict[str, EventCategory] = {
    "hiking": EventCategory.HIKING,
    "yürüyüş": EventCategory.HIKING,
    "doğa yürüyüşü": EventCategory.HIKING,
    "trekking": EventCategory.HIKING,
    "tırmanış": EventCategory.CLIMBING,
    "climbing": EventCategory.CLIMBING,
    "dağcılık": EventCategory.CLIMBING,
    "kaya tırmanış": EventCategory.CLIMBING,
    "çevre": EventCategory.ENVIRONMENT,
    "environment": EventCategory.ENVIRONMENT,
    "kurtarma": EventCategory.RESCUE,
    "rescue": EventCategory.RESCUE,
}

_DAY_NAMES = {
    "pazartesi": 0, "salı": 1, "çarşamba": 2, "perşembe": 3,
    "cuma": 4, "cumartesi": 5, "pazar": 6,
}

_TIME_WEEKEND   = {"bu hafta sonu", "bu haftasonu", "hafta sonu", "hafta sonunda"}
_TIME_THISWEEK  = {"bu hafta"}
_TIME_NEXTWEEK  = {"gelecek hafta", "önümüzdeki hafta"}
_TIME_THISMONTH = {"bu ay"}


# ---------- Tarih aralığı tespiti ----------

def detect_date_range(message: str) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    msg = message.lower()

    for day_name, day_idx in _DAY_NAMES.items():
        if f"bu {day_name}" in msg or f"önümüzdeki {day_name}" in msg:
            days_ahead = (day_idx - now.weekday()) % 7 or 7
            target = (now + timedelta(days=days_ahead)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            return target, target.replace(hour=23, minute=59, second=59)

    if any(kw in msg for kw in _TIME_WEEKEND):
        days_to_sat = (5 - now.weekday()) % 7 or 7
        sat = (now + timedelta(days=days_to_sat)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return sat, sat + timedelta(days=1, hours=23, minutes=59, seconds=59)

    if any(kw in msg for kw in _TIME_NEXTWEEK):
        days_to_mon = (7 - now.weekday()) % 7 or 7
        start = (now + timedelta(days=days_to_mon)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return start, start + timedelta(days=6, hours=23, minutes=59, seconds=59)

    if any(kw in msg for kw in _TIME_THISWEEK):
        days_to_sun = (6 - now.weekday()) % 7
        end = (now + timedelta(days=days_to_sun)).replace(
            hour=23, minute=59, second=59, microsecond=0
        )
        return now, end

    if any(kw in msg for kw in _TIME_THISMONTH):
        last_day = (now.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        return now, last_day.replace(hour=23, minute=59, second=59, microsecond=0)

    return now, now + timedelta(days=90)


# ---------- Metin oluşturucular ----------

def build_profile_summary(profile: VolunteerProfile, past_events: list[Event]) -> str:
    parts: list[str] = []
    parts.append(
        f"Deneyim Seviyesi: {_EXPERIENCE_TR.get(profile.experience_level.value, profile.experience_level.value)}."
    )
    if profile.city:
        parts.append(f"Şehir: {profile.city}.")
    if profile.max_altitude_m:
        parts.append(f"Maksimum İrtifa: {profile.max_altitude_m}m.")
    if profile.equipment_list:
        eq_names = [
            _EQUIPMENT_TR.get(eq.equipment_type.value, eq.equipment_type.value)
            for eq in profile.equipment_list
        ]
        parts.append(f"Sahip Olduğu Ekipmanlar: {', '.join(eq_names)}.")
    if past_events:
        categories = list({_CATEGORY_TR.get(e.category.value, e.category.value) for e in past_events})
        difficulties = list({_DIFFICULTY_TR.get(e.difficulty.value, e.difficulty.value) for e in past_events})
        parts.append(f"Geçmiş Etkinlik Türleri: {', '.join(categories)}.")
        parts.append(f"Geçmiş Etkinlik Zorlukları: {', '.join(difficulties)}.")
    return " ".join(parts)


def build_event_summary(event: Event) -> str:
    eq_str = ""
    if event.required_equipment and isinstance(event.required_equipment, dict):
        eq_str = f"Gereken ekipmanlar: {', '.join(str(k) for k in event.required_equipment.keys())}."
    return (
        f"Tür: {_CATEGORY_TR.get(event.category.value, event.category.value)}. "
        f"Zorluk: {_DIFFICULTY_TR.get(event.difficulty.value, event.difficulty.value)}. "
        f"Konum: {event.location_name or 'Belirtilmemiş'}. {eq_str}"
    ).strip()


# ---------- Etkinlik arama ----------

async def search_events(
    db: AsyncSession,
    message: str,
    city: str | None,
    activity: str | None,
    difficulty: str | None,
) -> list[dict]:
    start_dt, end_dt = detect_date_range(message)

    query = select(Event).where(
        Event.status.in_([EventStatus.OPEN, EventStatus.COMPLETED]),
        Event.start_date >= start_dt,
        Event.start_date <= end_dt,
    )

    if city:
        query = query.where(Event.location_name.ilike(f"%{city}%"))

    if activity:
        matched_category = next(
            (cat for kw, cat in _ACTIVITY_TO_CATEGORY.items() if kw in activity.lower()),
            None,
        )
        if matched_category:
            query = query.where(Event.category == matched_category)

    if difficulty:
        allowed = _DIFFICULTY_TO_ENUM.get(difficulty.lower(), [])
        if allowed:
            query = query.where(or_(*[Event.difficulty == d for d in allowed]))

    events = (await db.execute(query.order_by(Event.start_date).limit(10))).scalars().all()

    return [
        {
            "id": str(e.id),
            "title": e.title,
            "category": _CATEGORY_TR.get(e.category.value, e.category.value),
            "difficulty": _DIFFICULTY_TR.get(e.difficulty.value, e.difficulty.value),
            "location_name": e.location_name,
            "start_date": e.start_date.isoformat(),
            "description": e.description,
        }
        for e in events
    ]


# ---------- Kullanıcı bağlam oluşturucu ----------

async def build_user_context(user: Optional[User], db: AsyncSession) -> str:
    if user is None:
        return "Kullanıcı giriş yapmamış. Genel bilgi ver."

    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    lines: list[str] = [
        f"Ad: {user.full_name}",
        f"Rol: {'Gönüllü' if role == 'volunteer' else 'Organizatör'}",
    ]

    if role == "volunteer":
        profile = await db.scalar(
            select(VolunteerProfile).where(VolunteerProfile.user_id == user.id)
        )
        if profile:
            lines.append(
                f"Deneyim: {_EXPERIENCE_TR.get(profile.experience_level.value, profile.experience_level.value)}"
            )
            if profile.city:
                lines.append(f"Şehir: {profile.city}")
            if profile.max_altitude_m:
                lines.append(f"Max irtifa: {profile.max_altitude_m}m")
            lines.append(f"Etki puanı: {profile.total_impact_score}")

        apps = (
            await db.execute(
                select(Application)
                .options(selectinload(Application.event))
                .where(Application.volunteer_id == user.id)
                .order_by(Application.applied_at.desc())
                .limit(5)
            )
        ).scalars().all()

        if apps:
            app_lines = []
            for a in apps:
                status_tr = {
                    "pending": "Bekliyor",
                    "approved": "Onaylandı",
                    "rejected": "Reddedildi",
                }.get(a.status.value if hasattr(a.status, "value") else str(a.status), str(a.status))
                title = a.event.title if a.event else "?"
                app_lines.append(f"  - {title} ({status_tr})")
            lines.append("Son başvurular:\n" + "\n".join(app_lines))

    elif role == "organizer":
        org = await db.scalar(
            select(Organization).where(Organization.owner_id == user.id)
        )
        if org:
            lines.append(f"Organizasyon: {org.name}")
            if org.city:
                lines.append(f"Organizasyon şehri: {org.city}")

        now = datetime.now(timezone.utc)
        events = (
            await db.execute(
                select(Event)
                .where(Event.created_by == user.id, Event.start_date >= now)
                .order_by(Event.start_date)
                .limit(5)
            )
        ).scalars().all()

        if events:
            ev_lines = [
                f"  - {e.title} ({e.start_date.strftime('%d.%m.%Y')}, {e.location_name or '?'})"
                for e in events
            ]
            lines.append("Yaklaşan etkinlikler:\n" + "\n".join(ev_lines))

        vol_count = await db.scalar(
            select(func.count()).select_from(Application)
            .join(Event, Application.event_id == Event.id)
            .where(Event.created_by == user.id, Application.status == ApplicationStatus.APPROVED)
        ) or 0
        lines.append(f"Toplam onaylı gönüllü: {vol_count}")

    return "\n".join(lines)


# ---------- TF-IDF öneri motoru ----------

def get_recommendations(user_summary: str, event_list: list[dict]) -> list[dict]:
    if not event_list:
        return []

    corpus = [user_summary] + [e["summary"] for e in event_list]
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)
    scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()  # type: ignore[index]

    for idx, score in enumerate(scores):
        event_list[idx]["match_score"] = round(float(score), 2)

    return sorted(event_list, key=lambda x: x["match_score"], reverse=True)
