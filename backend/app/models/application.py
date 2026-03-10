from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import BaseModel

class ApplicationStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Application(BaseModel):
    __tablename__ = "applications"
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    volunteer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    motivation_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus, name="application_status"), nullable=False, default=ApplicationStatus.PENDING)
    reviewer_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    checked_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event: Mapped["Event"] = relationship(back_populates="applications")
    volunteer: Mapped["User"] = relationship(back_populates="applications")


