# filepath: backend/app/api/v1/events.py
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.event import Event, EventCategory, EventDifficulty, EventStatus
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.schemas.event import EventCreate, EventListResponse, EventResponse, EventUpdate
from app.services.event_service import EventService

router = APIRouter(tags=["events"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


def _event_to_response(
    event: Event,
    org: Organization | None = None,
    creator: User | None = None,
) -> EventResponse:
    cover_photo_url = None
    if "photos" in event.__dict__ and event.photos:
        cover = next((p for p in event.photos if p.is_cover), None) or event.photos[0]
        cover_photo_url = cover.file_path

    return EventResponse.model_validate({
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
        "organization_name": org.name if org else None,
        "organization_logo_url": org.logo_url if org else None,
        "organizer_name": creator.full_name if creator else None,
        "cover_photo_url": cover_photo_url,
        "waypoints": event.waypoints,
        "route_geojson": event.route_geojson,
    })


@router.get("/", response_model=EventListResponse)
async def list_events(
    db: DbSessionDep,
    category: Optional[EventCategory] = Query(default=None),
    difficulty: Optional[EventDifficulty] = Query(default=None),
    status: Optional[EventStatus] = Query(default=None),
    skip: int = 0,
    limit: int = 20,
) -> EventListResponse:
    events, total = await EventService(db).list(category, difficulty, status, skip, limit)
    items = [_event_to_response(e, org=e.organization, creator=e.created_by_user) for e in events]
    return EventListResponse(items=items, total=total)


@router.get("/users/me/events", response_model=EventListResponse)
async def list_my_events(
    db: DbSessionDep,
    current_user: CurrentUserDep,
    skip: int = 0,
    limit: int = 100,
) -> EventListResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers can list their events")
    events, total = await EventService(db).list_by_creator(current_user.id, skip, limit)
    items = [_event_to_response(e, org=e.organization, creator=e.created_by_user) for e in events]
    return EventListResponse(items=items, total=total)


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_in: EventCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> EventResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers can create events")
    svc = EventService(db)
    event = await svc.create(event_in, current_user)
    full_event = await svc.get_by_id(event.id)
    return _event_to_response(full_event, org=full_event.organization, creator=full_event.created_by_user)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: UUID, db: DbSessionDep) -> EventResponse:
    event = await EventService(db).get_by_id(event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_to_response(event, org=event.organization, creator=event.created_by_user)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: UUID,
    event_in: EventUpdate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> EventResponse:
    svc = EventService(db)
    event = await svc.get_by_id(event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the creator can update this event")
    event = await svc.update(event, event_in)
    return _event_to_response(event, org=event.organization, creator=event.created_by_user)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> None:
    svc = EventService(db)
    event = await svc.get_by_id(event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    if event.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the creator can delete this event")
    await svc.delete(event)
