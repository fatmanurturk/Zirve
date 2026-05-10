# filepath: backend/app/api/v1/event_photos.py
from typing import Annotated, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.event_photo import EventPhotoResponse, EventPhotoReorder
from app.services.event_photo_service import EventPhotoService
from app.services.storage_service import get_storage_service

router = APIRouter(tags=["event-photos"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]

def get_photo_service(db: DbSessionDep) -> EventPhotoService:
    return EventPhotoService(db, get_storage_service())

@router.post("/{event_id}", response_model=EventPhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_event_photo(
    event_id: str,
    current_user: CurrentUserDep,
    db: DbSessionDep,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None)
):
    try:
        event_uuid = UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format")
    
    service = get_photo_service(db)
    return await service.upload_photo(event_uuid, current_user, file, caption)

@router.get("/{event_id}", response_model=List[EventPhotoResponse])
async def list_event_photos(
    event_id: str,
    db: DbSessionDep
):
    try:
        event_uuid = UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format")
        
    service = get_photo_service(db)
    return await service.get_event_photos(event_uuid)

@router.delete("/{event_id}/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event_photo(
    event_id: str,
    photo_id: str,
    current_user: CurrentUserDep,
    db: DbSessionDep
):
    try:
        photo_uuid = UUID(photo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid photo ID format")
        
    service = get_photo_service(db)
    await service.delete_photo(photo_uuid, current_user)
    return None

@router.patch("/{event_id}/{photo_id}/cover", response_model=EventPhotoResponse)
async def set_event_cover_photo(
    event_id: str,
    photo_id: str,
    current_user: CurrentUserDep,
    db: DbSessionDep
):
    try:
        photo_uuid = UUID(photo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid photo ID format")
        
    service = get_photo_service(db)
    return await service.set_cover_photo(photo_uuid, current_user)

@router.patch("/{event_id}/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_event_photos(
    event_id: str,
    reorder_in: EventPhotoReorder,
    current_user: CurrentUserDep,
    db: DbSessionDep
):
    try:
        event_uuid = UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid event ID format")
        
    service = get_photo_service(db)
    await service.reorder_photos(event_uuid, reorder_in.photo_ids, current_user)
    return None
