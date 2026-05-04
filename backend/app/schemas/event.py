# filepath: backend/app/schemas/event.py
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.event import EventCategory, EventDifficulty, EventStatus


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: EventCategory
    difficulty: EventDifficulty
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: datetime
    end_date: datetime
    max_volunteers: Optional[int] = None
    requirements: Optional[dict] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[EventCategory] = None
    difficulty: Optional[EventDifficulty] = None
    status: Optional[EventStatus] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_volunteers: Optional[int] = None
    requirements: Optional[dict] = None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: Optional[str] = None
    category: EventCategory
    difficulty: EventDifficulty
    status: EventStatus
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: datetime
    end_date: datetime
    max_volunteers: Optional[int] = None
    requirements: Optional[dict] = None
    created_by: UUID
    organization_id: Optional[UUID] = None
    created_at: datetime
    # Kulüp & Organizatör bilgileri
    organization_name: Optional[str] = None
    organization_logo_url: Optional[str] = None
    organizer_name: Optional[str] = None


class EventListResponse(BaseModel):
    items: List[EventResponse]
    total: int

