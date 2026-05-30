from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.event import Event, EventCategory, EventDifficulty, EventStatus
from app.models.organization import Organization
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate


class EventService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_or_create_organization(self, owner: User) -> Organization:
        org = await self.db.scalar(
            select(Organization).where(Organization.owner_id == owner.id)
        )
        if org is None:
            org = Organization(
                owner_id=owner.id,
                name=f"{owner.full_name} Organizasyonu",
                is_verified=False,
            )
            self.db.add(org)
            await self.db.commit()
            await self.db.refresh(org)
        return org

    async def create(self, event_in: EventCreate, creator: User) -> Event:
        org = await self._get_or_create_organization(creator)

        event = Event(
            organization_id=org.id,
            created_by=creator.id,
            title=event_in.title,
            description=event_in.description,
            category=event_in.category,
            difficulty=event_in.difficulty,
            location_name=event_in.location_name,
            latitude=event_in.latitude,
            longitude=event_in.longitude,
            start_date=event_in.start_date,
            end_date=event_in.end_date,
            max_volunteers=event_in.max_volunteers,
            required_equipment=event_in.requirements,
            waypoints=event_in.waypoints,
            route_geojson=event_in.route_geojson,
            status=EventStatus.OPEN,
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def get_by_id(self, event_id: UUID) -> Event | None:
        return await self.db.scalar(
            select(Event)
            .options(
                joinedload(Event.organization),
                joinedload(Event.created_by_user),
                joinedload(Event.photos),
            )
            .where(Event.id == event_id)
        )

    async def list(
        self,
        category: Optional[EventCategory] = None,
        difficulty: Optional[EventDifficulty] = None,
        status: Optional[EventStatus] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Event], int]:
        query = select(Event).options(
            joinedload(Event.organization),
            joinedload(Event.created_by_user),
            joinedload(Event.photos),
        )
        count_query = select(func.count()).select_from(Event)

        if category is not None:
            query = query.where(Event.category == category)
            count_query = count_query.where(Event.category == category)
        if difficulty is not None:
            query = query.where(Event.difficulty == difficulty)
            count_query = count_query.where(Event.difficulty == difficulty)
        if status is not None:
            query = query.where(Event.status == status)
            count_query = count_query.where(Event.status == status)

        total = await self.db.scalar(count_query) or 0
        events = (await self.db.execute(query.offset(skip).limit(limit))).scalars().unique().all()
        return list(events), int(total)

    async def list_by_creator(
        self, creator_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[Event], int]:
        query = (
            select(Event)
            .options(
                joinedload(Event.organization),
                joinedload(Event.created_by_user),
                joinedload(Event.photos),
            )
            .where(Event.created_by == creator_id)
        )
        count_query = select(func.count()).select_from(Event).where(Event.created_by == creator_id)

        total = await self.db.scalar(count_query) or 0
        events = (await self.db.execute(query.offset(skip).limit(limit))).scalars().unique().all()
        return list(events), int(total)

    async def update(self, event: Event, event_in: EventUpdate) -> Event:
        update_data = event_in.model_dump(exclude_unset=True)
        if "requirements" in update_data:
            event.required_equipment = update_data.pop("requirements")
        for field, value in update_data.items():
            setattr(event, field, value)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def delete(self, event: Event) -> None:
        await self.db.delete(event)
        await self.db.commit()
