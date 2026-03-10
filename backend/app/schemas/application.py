from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    motivation_letter: Optional[str] = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    reviewer_note: Optional[str] = None


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    volunteer_id: UUID
    motivation_letter: Optional[str]
    status: ApplicationStatus
    reviewer_note: Optional[str]
    checked_in: bool
    checked_in_at: Optional[datetime]
    applied_at: datetime
    created_at: datetime


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int