from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AIQueryRequest(BaseModel):
    message: str


class AIIntentResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    city: Optional[str] = None
    activity: Optional[str] = None
    model_text: Optional[str] = None


class EventRecommendation(BaseModel):
    id: UUID
    title: str
    category: str
    difficulty: str
    location_name: Optional[str] = None
    start_date: datetime
    match_score: float
    description: Optional[str] = None


class AIRecommendResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    recommendations: list[EventRecommendation]
    profile_summary: str
    model_text: Optional[str] = None
