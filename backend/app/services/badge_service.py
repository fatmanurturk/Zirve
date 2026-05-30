from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.badge import Badge, UserBadge
from app.models.event import Event
from app.models.user import User
from app.schemas.badge import BadgeCreate, BadgeUpdate


class BadgeService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, badge_in: BadgeCreate) -> Badge:
        existing = await self.db.scalar(
            select(Badge).where(Badge.name == badge_in.name)
        )
        if existing is not None:
            raise ValueError("Bu isimde bir rozet zaten mevcut.")

        badge = Badge(
            name=badge_in.name,
            description=badge_in.description,
            icon_url=badge_in.icon_url,
            category=badge_in.category,
            criteria=badge_in.criteria,
            score_threshold=badge_in.score_threshold,
        )
        self.db.add(badge)
        await self.db.commit()
        await self.db.refresh(badge)
        return badge

    async def update(self, badge: Badge, badge_in: BadgeUpdate) -> Badge:
        update_data = badge_in.model_dump(exclude_unset=True)
        if "name" in update_data and update_data["name"] is not None:
            name_conflict = await self.db.scalar(
                select(Badge).where(
                    Badge.name == update_data["name"],
                    Badge.id != badge.id,
                )
            )
            if name_conflict is not None:
                raise ValueError("Bu isimde bir rozet zaten mevcut.")

        for field, value in update_data.items():
            setattr(badge, field, value)
        await self.db.commit()
        await self.db.refresh(badge)
        return badge

    async def delete(self, badge: Badge) -> None:
        await self.db.delete(badge)
        await self.db.commit()

    async def award(
        self,
        user_id: UUID,
        badge_id: UUID,
        earned_from_event_id: UUID | None = None,
    ) -> tuple[UserBadge, Badge]:
        user = await self.db.scalar(select(User).where(User.id == user_id))
        if user is None:
            raise ValueError("Kullanici bulunamadi.")

        badge = await self.db.scalar(select(Badge).where(Badge.id == badge_id))
        if badge is None:
            raise ValueError("Rozet bulunamadi.")

        if earned_from_event_id is not None:
            event = await self.db.scalar(
                select(Event).where(Event.id == earned_from_event_id)
            )
            if event is None:
                raise ValueError("Etkinlik bulunamadi.")

        already_awarded = await self.db.scalar(
            select(UserBadge).where(
                UserBadge.user_id == user_id,
                UserBadge.badge_id == badge_id,
            )
        )
        if already_awarded is not None:
            raise ValueError("Bu rozet kullaniciya zaten verilmis.")

        user_badge = UserBadge(
            user_id=user_id,
            badge_id=badge_id,
            earned_from_event_id=earned_from_event_id,
            earned_at=datetime.now(timezone.utc),
        )
        self.db.add(user_badge)
        await self.db.commit()
        await self.db.refresh(user_badge)
        return user_badge, badge
