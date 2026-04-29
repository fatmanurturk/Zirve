from __future__ import annotations
from uuid import UUID
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import BaseModel

class OrganizationFollower(BaseModel):
    __tablename__ = "organization_followers"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    user: Mapped["User"] = relationship()
    organization: Mapped["Organization"] = relationship(back_populates="followers")
