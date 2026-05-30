from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, ApplicationStatus
from app.models.badge import UserBadge
from app.models.volunteer import VolunteerProfile


class VolunteerService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_stats(self, volunteer_id: UUID) -> dict:
        total = await self.db.scalar(
            select(func.count()).select_from(Application).where(
                Application.volunteer_id == volunteer_id
            )
        )

        approved = await self.db.scalar(
            select(func.count()).select_from(Application).where(
                Application.volunteer_id == volunteer_id,
                Application.status == ApplicationStatus.APPROVED,
            )
        )

        checked_in = await self.db.scalar(
            select(func.count()).select_from(Application).where(
                Application.volunteer_id == volunteer_id,
                Application.checked_in.is_(True),
            )
        )

        badge_count = await self.db.scalar(
            select(func.count()).select_from(UserBadge).where(
                UserBadge.user_id == volunteer_id
            )
        )

        profile = await self.db.scalar(
            select(VolunteerProfile).where(VolunteerProfile.user_id == volunteer_id)
        )

        return {
            "total_applications": int(total or 0),
            "approved_applications": int(approved or 0),
            "checked_in_count": int(checked_in or 0),
            "badge_count": int(badge_count or 0),
            "total_impact_score": int(profile.total_impact_score if profile else 0),
        }
