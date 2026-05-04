from uuid import UUID
import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, Enum, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import BaseModel

class ExperienceLevel(enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    EXPERT = "expert"

class EquipmentType(enum.Enum):
    HELMET = "helmet"
    CRAMPON = "crampon"
    ROPE = "rope"
    SLEEPING_BAG = "sleeping_bag"
    TENT = "tent"
    HARNESS = "harness"
    OTHER = "other"

class EquipmentCondition(enum.Enum):
    NEW = "new"
    GOOD = "good"
    FAIR = "fair"

class VolunteerProfile(BaseModel):
    __tablename__ = "volunteer_profiles"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    bio: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    experience_level: Mapped[ExperienceLevel] = mapped_column(Enum(ExperienceLevel, name="experience_level"), nullable=False)
    max_altitude_m: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_impact_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    emergency_contact: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    user: Mapped["User"] = relationship(back_populates="volunteer_profile")
    equipment_list: Mapped[List["VolunteerEquipment"]] = relationship(back_populates="volunteer_profile", cascade="all, delete-orphan")

class VolunteerEquipment(BaseModel):
    __tablename__ = "volunteer_equipment"
    volunteer_id: Mapped[UUID] = mapped_column(ForeignKey("volunteer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    equipment_type: Mapped[EquipmentType] = mapped_column(Enum(EquipmentType, name="equipment_type"), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    condition: Mapped[EquipmentCondition] = mapped_column(Enum(EquipmentCondition, name="equipment_condition"), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    volunteer_profile: Mapped["VolunteerProfile"] = relationship(back_populates="equipment_list")
