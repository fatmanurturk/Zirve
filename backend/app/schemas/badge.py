from __future__ import annotations
# filepath: backend/app/schemas/badge.py

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.badge import BadgeCategory


class BadgeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category: BadgeCategory
    criteria: dict
    score_threshold: int


class BadgeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category: Optional[BadgeCategory] = None
    criteria: Optional[dict] = None
    score_threshold: Optional[int] = None


class BadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    category: BadgeCategory
    criteria: dict
    score_threshold: int
    created_at: datetime


class BadgeListResponse(BaseModel):
    items: List[BadgeResponse]
    total: int


class AwardBadgeRequest(BaseModel):
    user_id: str
    badge_id: str
    earned_from_event_id: Optional[str] = None


class UserBadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    badge_id: UUID
    earned_from_event_id: Optional[UUID] = None
    earned_at: datetime
    badge: BadgeResponse

