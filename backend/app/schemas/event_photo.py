# filepath: backend/app/schemas/event_photo.py
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class EventPhotoBase(BaseModel):
    caption: Optional[str] = Field(None, max_length=255)
    display_order: int = 0
    is_cover: bool = False

class EventPhotoCreate(EventPhotoBase):
    pass

class EventPhotoUpdate(BaseModel):
    caption: Optional[str] = Field(None, max_length=255)
    display_order: Optional[int] = None
    is_cover: Optional[bool] = None

class EventPhotoResponse(EventPhotoBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_id: UUID
    file_path: str
    original_filename: str
    uploaded_at: datetime

class EventPhotoReorder(BaseModel):
    photo_ids: List[UUID]
