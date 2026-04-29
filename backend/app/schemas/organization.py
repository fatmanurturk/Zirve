from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class OrganizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    name: str
    description: Optional[str]
    logo_url: Optional[str]
    website: Optional[str]
    city: Optional[str]
    category: Optional[str]
    tags: List[str]
    is_verified: bool
    created_at: datetime


class OrganizationWithEventsResponse(OrganizationResponse):
    event_count: int

class OrganizationStats(BaseModel):
    followers: int
    active_volunteers: int
    completed_events: int
    total_hours: int

class OrganizationProfileResponse(OrganizationResponse):
    stats: OrganizationStats
