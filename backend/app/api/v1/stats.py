# filepath: backend/app/api/v1/stats.py
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.event import Event, EventStatus

router = APIRouter(tags=["stats"])

@router.get("/stats")
async def get_platform_stats(db: AsyncSession = Depends(get_db)):
    volunteers_count_res = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.VOLUNTEER, User.is_active.is_(True))
    )
    volunteers_count = volunteers_count_res.scalar_one() or 0

    events_count_res = await db.execute(
        select(func.count(Event.id)).where(Event.status == EventStatus.OPEN)
    )
    events_count = events_count_res.scalar_one() or 0

    cities_count_res = await db.execute(
        select(func.count(distinct(Event.location_name))).where(Event.location_name.isnot(None))
    )
    cities_count = cities_count_res.scalar_one() or 0

    return {
        "active_volunteers": volunteers_count,
        "upcoming_events": events_count,
        "cities_count": cities_count
    }
