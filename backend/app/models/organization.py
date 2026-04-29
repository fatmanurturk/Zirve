from __future__ import annotations
from typing import List, Optional
from sqlalchemy import Boolean, ForeignKey, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import BaseModel

class Organization(BaseModel):
    __tablename__ = "organizations"
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(JSON, server_default='[]')
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    owner: Mapped["User"] = relationship(back_populates="organizations")
    events: Mapped[List["Event"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    followers: Mapped[List["OrganizationFollower"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
