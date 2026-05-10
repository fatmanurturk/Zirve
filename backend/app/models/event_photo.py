# filepath: backend/app/models/event_photo.py
from __future__ import annotations
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import BaseModel
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .event import Event

class EventPhoto(BaseModel):
    __tablename__ = "event_photos"

    event_id: Mapped[UUID] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    caption: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False)

    event: Mapped["Event"] = relationship(back_populates="photos")
