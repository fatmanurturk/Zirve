# filepath: backend/app/models/user.py
from __future__ import annotations
import enum
from typing import List, Optional
from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import BaseModel

class UserRole(enum.Enum):
    VOLUNTEER = "volunteer"
    ORGANIZER = "organizer"

class User(BaseModel):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    volunteer_profile: Mapped[Optional["VolunteerProfile"]] = relationship(back_populates="user", uselist=False)
    organizations: Mapped[List["Organization"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    events_created: Mapped[List["Event"]] = relationship(back_populates="created_by_user")
    applications: Mapped[List["Application"]] = relationship(back_populates="volunteer")
    user_badges: Mapped[List["UserBadge"]] = relationship(back_populates="user", cascade="all, delete-orphan")
