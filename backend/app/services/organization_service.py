from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import Application, ApplicationStatus
from app.models.event import Event, EventStatus
from app.models.organization import Organization
from app.models.organization_follower import OrganizationFollower
from app.schemas.organization import OrganizationCreate, OrganizationStats, OrganizationUpdate


class OrganizationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, owner_id: UUID, body: OrganizationCreate) -> Organization:
        existing = await self.db.scalar(
            select(Organization).where(Organization.owner_id == owner_id)
        )
        if existing is not None:
            raise ValueError("Zaten bir organizasyonunuz var.")

        org = Organization(
            owner_id=owner_id,
            name=body.name,
            description=body.description,
            logo_url=body.logo_url,
            website=body.website,
            city=body.city,
            category=body.category,
            tags=body.tags,
            is_verified=False,
        )
        self.db.add(org)
        await self.db.commit()
        await self.db.refresh(org)
        return org

    async def get_by_owner(self, owner_id: UUID) -> Organization | None:
        return await self.db.scalar(
            select(Organization).where(Organization.owner_id == owner_id)
        )

    async def update(self, org: Organization, body: OrganizationUpdate) -> Organization:
        for field, value in body.model_dump(exclude_unset=True).items():
            setattr(org, field, value)
        await self.db.commit()
        await self.db.refresh(org)
        return org

    async def delete(self, org: Organization) -> None:
        await self.db.delete(org)
        await self.db.commit()

    async def get_stats(self, org_id: UUID) -> OrganizationStats:
        followers_count = await self.db.scalar(
            select(func.count()).select_from(OrganizationFollower).where(
                OrganizationFollower.organization_id == org_id
            )
        ) or 0

        completed_events_count = await self.db.scalar(
            select(func.count()).select_from(Event).where(
                Event.organization_id == org_id,
                Event.status == EventStatus.COMPLETED,
            )
        ) or 0

        active_volunteers_count = await self.db.scalar(
            select(func.count()).select_from(Application)
            .join(Event, Application.event_id == Event.id)
            .where(
                Event.organization_id == org_id,
                Application.status == ApplicationStatus.APPROVED,
            )
        ) or 0

        total_hours = int(completed_events_count) * 5 * int(active_volunteers_count)

        return OrganizationStats(
            followers=int(followers_count),
            active_volunteers=int(active_volunteers_count),
            completed_events=int(completed_events_count),
            total_hours=total_hours,
        )

    async def toggle_follow(self, org_id: UUID, user_id: UUID) -> str:
        follow = await self.db.scalar(
            select(OrganizationFollower).where(
                OrganizationFollower.organization_id == org_id,
                OrganizationFollower.user_id == user_id,
            )
        )
        if follow:
            await self.db.delete(follow)
            await self.db.commit()
            return "unfollowed"

        self.db.add(OrganizationFollower(user_id=user_id, organization_id=org_id))
        await self.db.commit()
        return "followed"
