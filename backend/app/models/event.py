from __future__ import annotations
import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import BaseModel

class EventCategory(enum.Enum):
    HIKING = "hiking"
    CLIMBING = "climbing"
    ENVIRONMENT = "environment"
    RESCUE = "rescue"
    OTHER = "other"

class EventDifficulty(enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"

class EventStatus(enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    FULL = "full"
    CLOSED = "closed"
    COMPLETED = "completed"

class Event(BaseModel):
    __tablename__ = "events"
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[EventCategory] = mapped_column(Enum(EventCategory, name="event_category"), nullable=False)
    difficulty: Mapped[EventDifficulty] = mapped_column(Enum(EventDifficulty, name="event_difficulty"), nullable=False)
    altitude_m: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(nullable=True)
    location_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    max_volunteers: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    impact_score_reward: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    required_equipment: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[EventStatus] = mapped_column(Enum(EventStatus, name="event_status"), nullable=False)
    organization: Mapped["Organization"] = relationship(back_populates="events")
    created_by_user: Mapped["User"] = relationship(back_populates="events_created")
    applications: Mapped[List["Application"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    user_badges: Mapped[List["UserBadge"]] = relationship(back_populates="earned_from_event")
