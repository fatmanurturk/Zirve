from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, ApplicationStatus
from app.models.event import Event, EventDifficulty
from app.models.volunteer import VolunteerProfile

DIFFICULTY_SCORES: dict[EventDifficulty, int] = {
    EventDifficulty.EASY: 10,
    EventDifficulty.MEDIUM: 20,
    EventDifficulty.HARD: 50,
    EventDifficulty.EXPERT: 100,
}


class ApplicationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def checkin(self, application: Application, event: Event) -> Application:
        if application.status != ApplicationStatus.APPROVED:
            raise ValueError("Sadece onaylı başvurular check-in yapılabilir.")
        if application.checked_in:
            raise ValueError("Bu gönüllü zaten check-in yapıldı.")

        application.checked_in = True
        application.checked_in_at = datetime.now(timezone.utc)

        await self._add_impact_score(application.volunteer_id, event.difficulty)
        await self.db.commit()
        await self.db.refresh(application)
        return application

    async def undo_checkin(self, application: Application, event: Event) -> Application:
        if not application.checked_in:
            raise ValueError("Bu gönüllü zaten check-in yapılmadı.")

        application.checked_in = False
        application.checked_in_at = None

        await self._deduct_impact_score(application.volunteer_id, event.difficulty)
        await self.db.commit()
        await self.db.refresh(application)
        return application

    async def _get_profile(self, volunteer_id: UUID) -> VolunteerProfile | None:
        return await self.db.scalar(
            select(VolunteerProfile).where(VolunteerProfile.user_id == volunteer_id)
        )

    async def _add_impact_score(self, volunteer_id: UUID, difficulty: EventDifficulty) -> None:
        score = DIFFICULTY_SCORES.get(difficulty, 0)
        if score == 0:
            return
        profile = await self._get_profile(volunteer_id)
        if profile is not None:
            profile.total_impact_score = (profile.total_impact_score or 0) + score

    async def _deduct_impact_score(self, volunteer_id: UUID, difficulty: EventDifficulty) -> None:
        score = DIFFICULTY_SCORES.get(difficulty, 0)
        if score == 0:
            return
        profile = await self._get_profile(volunteer_id)
        if profile is not None:
            profile.total_impact_score = max(0, (profile.total_impact_score or 0) - score)
