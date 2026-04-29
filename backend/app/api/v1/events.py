# filepath: backend/app/api/v1/events.py
from datetime import datetime
from typing import Annotated, Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.event import (
    Event,
    EventCategory,
    EventDifficulty,
    EventStatus,
)
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.schemas.event import (
    EventCreate,
    EventUpdate,
    EventResponse,
    EventListResponse,
)


router = APIRouter(tags=["events"])


DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


def _event_to_response(event: Event) -> EventResponse:
    data = {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "category": event.category,
        "difficulty": event.difficulty,
        "status": event.status,
        "location_name": event.location_name,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "start_date": event.start_date,
        "end_date": event.end_date,
        "max_volunteers": event.max_volunteers,
        "requirements": event.required_equipment,
        "created_by": event.created_by,
        "organization_id": event.organization_id,
        "created_at": event.created_at,
    }
    return EventResponse.model_validate(data)


@router.get("/", response_model=EventListResponse)
async def list_events(
    db: DbSessionDep,
    category: Optional[EventCategory] = Query(default=None),
    difficulty: Optional[EventDifficulty] = Query(default=None),
    status: Optional[EventStatus] = Query(default=None),
    skip: int = 0,
    limit: int = 20,
) -> EventListResponse:
    query = select(Event)

    if category is not None:
        query = query.where(Event.category == category)
    if difficulty is not None:
        query = query.where(Event.difficulty == difficulty)
    if status is not None:
        query = query.where(Event.status == status)

    total_query = select(func.count()).select_from(Event)
    if category is not None:
        total_query = total_query.where(Event.category == category)
    if difficulty is not None:
        total_query = total_query.where(Event.difficulty == difficulty)
    if status is not None:
        total_query = total_query.where(Event.status == status)

    total_result = await db.execute(total_query)
    total = total_result.scalar_one() or 0

    result = await db.execute(query.offset(skip).limit(limit))
    events: List[Event] = result.scalars().all()

    return EventListResponse(
        items=[_event_to_response(event) for event in events],
        total=total,
    )


@router.get("/users/me/events", response_model=EventListResponse)
async def list_my_events(
    db: DbSessionDep,
    current_user: CurrentUserDep,
    skip: int = 0,
    limit: int = 100,
) -> EventListResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can list their events",
        )
    
    query = select(Event).where(Event.created_by == current_user.id)
    count_query = select(func.count()).select_from(Event).where(Event.created_by == current_user.id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar_one() or 0
    
    result = await db.execute(query.offset(skip).limit(limit))
    events: List[Event] = result.scalars().all()
    
    return EventListResponse(
        items=[_event_to_response(event) for event in events],
        total=total,
    )


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_in: EventCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> EventResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organizers can create events",
        )

    org_result = await db.execute(
        select(Organization).where(Organization.owner_id == current_user.id)
    )
    organization = org_result.scalars().first()
    if organization is None:
        # Organizasyonu olmayan organizatörlere otomatik varsayılan kurum oluştur
        organization = Organization(
            owner_id=current_user.id,
            name=f"{current_user.full_name} Organizasyonu",
            is_verified=False
        )
        db.add(organization)
        await db.commit()
        await db.refresh(organization)

    event = Event(
        organization_id=organization.id,
        created_by=current_user.id,
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
        status=EventStatus.OPEN,
    )

    db.add(event)
    await db.commit()
    await db.refresh(event)

    return _event_to_response(event)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: UUID,
    db: DbSessionDep,
) -> EventResponse:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return _event_to_response(event)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: UUID,
    event_in: EventUpdate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> EventResponse:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    if event.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can update this event",
        )

    update_data = event_in.model_dump(exclude_unset=True)
    if "requirements" in update_data:
        event.required_equipment = update_data.pop("requirements")

    for field, value in update_data.items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)

    return _event_to_response(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> None:
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    if event.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can delete this event",
        )

    await db.delete(event)
    await db.commit()

    return None

