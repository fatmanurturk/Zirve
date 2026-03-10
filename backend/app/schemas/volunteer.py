from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.volunteer import EquipmentCondition, EquipmentType, ExperienceLevel
from app.schemas.badge import BadgeResponse, UserBadgeResponse

__all__ = [
    "BadgeResponse",
    "UserBadgeResponse",
    "VolunteerEquipmentResponse",
    "VolunteerProfileCreate",
    "VolunteerProfileUpdate",
    "VolunteerProfileResponse",
    "EquipmentCreate",
    "UserStatsResponse",
    "PublicProfileResponse",
]


class VolunteerEquipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    equipment_type: EquipmentType
    brand: Optional[str]
    condition: EquipmentCondition
    verified: bool


class VolunteerProfileCreate(BaseModel):
    experience_level: ExperienceLevel
    bio: Optional[str] = None
    max_altitude_m: Optional[int] = None
    city: Optional[str] = None
    emergency_contact: Optional[dict] = None


class VolunteerProfileUpdate(BaseModel):
    experience_level: Optional[ExperienceLevel] = None
    bio: Optional[str] = None
    max_altitude_m: Optional[int] = None
    city: Optional[str] = None
    emergency_contact: Optional[dict] = None


class VolunteerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    bio: Optional[str]
    experience_level: ExperienceLevel
    max_altitude_m: Optional[int]
    total_impact_score: int
    city: Optional[str]
    emergency_contact: Optional[dict]
    equipment_list: list[VolunteerEquipmentResponse] = []


class EquipmentCreate(BaseModel):
    equipment_type: EquipmentType
    condition: EquipmentCondition
    brand: Optional[str] = None


class UserStatsResponse(BaseModel):
    total_applications: int
    approved_applications: int
    checked_in_count: int
    total_impact_score: int
    badge_count: int


class PublicProfileResponse(BaseModel):
    user_id: UUID
    full_name: str
    avatar_url: Optional[str]
    city: Optional[str]
    experience_level: ExperienceLevel
    total_impact_score: int
    badge_count: int
