from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import BaseModel

class BadgeCategory(enum.Enum):
    SUMMIT = "summit"
    NATURE = "nature"
    TEAM = "team"
    MILESTONE = "milestone"

class Badge(BaseModel):
    __tablename__ = "badges"
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    category: Mapped[BadgeCategory] = mapped_column(Enum(BadgeCategory, name="badge_category"), nullable=False)
    criteria: Mapped[dict] = mapped_column(JSON, nullable=False)
    score_threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    user_badges: Mapped[list["UserBadge"]] = relationship(back_populates="badge", cascade="all, delete-orphan")

class UserBadge(BaseModel):
    __tablename__ = "user_badges"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_id: Mapped[int] = mapped_column(ForeignKey("badges.id", ondelete="CASCADE"), nullable=False, index=True)
    earned_from_event_id: Mapped[Optional[int]] = mapped_column(ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user: Mapped["User"] = relationship(back_populates="user_badges")
    badge: Mapped["Badge"] = relationship(back_populates="user_badges")
    earned_from_event: Mapped[Optional["Event"]] = relationship(back_populates="user_badges")
