from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.application import Application, ApplicationStatus
from app.models.event import Event
from app.models.user import User, UserRole
from app.models.volunteer_location import VolunteerLocation

router = APIRouter(tags=["locations"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


class LocationUpsert(BaseModel):
    lat: float
    lng: float
    is_active: bool = True


class LocationResponse(BaseModel):
    volunteer_id: UUID
    lat: float
    lng: float
    is_active: bool
    updated_at: datetime
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


@router.put("/locations/me", response_model=LocationResponse, status_code=200)
async def upsert_my_location(
    payload: LocationUpsert,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> LocationResponse:
    if current_user.role != UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Sadece gönüllüler konum paylaşabilir.")

    result = await db.execute(
        select(VolunteerLocation).where(VolunteerLocation.volunteer_id == current_user.id)
    )
    loc = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if loc:
        loc.lat = payload.lat
        loc.lng = payload.lng
        loc.is_active = payload.is_active
        loc.updated_at = now
    else:
        loc = VolunteerLocation(
            volunteer_id=current_user.id,
            lat=payload.lat,
            lng=payload.lng,
            is_active=payload.is_active,
            updated_at=now,
        )
        db.add(loc)

    await db.commit()
    await db.refresh(loc)
    return LocationResponse(
        volunteer_id=loc.volunteer_id,
        lat=loc.lat,
        lng=loc.lng,
        is_active=loc.is_active,
        updated_at=loc.updated_at,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
    )


@router.delete("/locations/me", status_code=204, response_model=None)
async def deactivate_my_location(db: DbSessionDep, current_user: CurrentUserDep):
    result = await db.execute(
        select(VolunteerLocation).where(VolunteerLocation.volunteer_id == current_user.id)
    )
    loc = result.scalar_one_or_none()
    if loc:
        loc.is_active = False
        loc.updated_at = datetime.now(timezone.utc)
        await db.commit()


@router.get("/locations/event/{event_id}", response_model=list[LocationResponse], status_code=200)
async def get_event_volunteers_locations(
    event_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> list[LocationResponse]:
    # Organizatör sadece kendi etkinliklerinin gönüllülerini görebilir
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı.")
    if event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Bu etkinliğe erişim izniniz yok.")

    # Bu etkinliğe onaylı başvurusu olan ve aktif konum paylaşan gönüllüler
    stale_threshold = datetime.now(timezone.utc) - timedelta(minutes=10)
    apps_res = await db.execute(
        select(Application).where(
            Application.event_id == event_id,
            Application.status == ApplicationStatus.APPROVED,
        )
    )
    volunteer_ids = [a.volunteer_id for a in apps_res.scalars().all()]
    if not volunteer_ids:
        return []

    locs_res = await db.execute(
        select(VolunteerLocation, User)
        .join(User, VolunteerLocation.volunteer_id == User.id)
        .where(
            VolunteerLocation.volunteer_id.in_(volunteer_ids),
            VolunteerLocation.is_active.is_(True),
            VolunteerLocation.updated_at >= stale_threshold,
        )
    )
    rows = locs_res.all()
    return [
        LocationResponse(
            volunteer_id=loc.volunteer_id,
            lat=loc.lat,
            lng=loc.lng,
            is_active=loc.is_active,
            updated_at=loc.updated_at,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
        )
        for loc, user in rows
    ]


@router.get("/locations/geocode", status_code=200)
async def geocode_address(address: str) -> dict:
    """Nominatim ile adres → koordinat (önbellek yok, çağrı başına 1 req)"""
    import httpx
    url = (
        f"https://nominatim.openstreetmap.org/search"
        f"?q={address}&format=json&limit=1&countrycodes=tr"
    )
    headers = {"User-Agent": "ZirveApp/1.0 contact@zirve.com"}
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=headers, timeout=10.0)
            data = resp.json()
            if data:
                return {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"]), "display_name": data[0]["display_name"]}
        except Exception:
            pass
    raise HTTPException(status_code=404, detail="Adres bulunamadı.")
