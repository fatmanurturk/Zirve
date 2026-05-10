# filepath: backend/app/services/event_photo_service.py
import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.event import Event
from app.models.event_photo import EventPhoto
from app.models.user import User
from app.services.storage_service import StorageService

class EventPhotoService:
    def __init__(self, db: AsyncSession, storage: StorageService):
        self.db = db
        self.storage = storage

    async def upload_photo(
        self, 
        event_id: UUID, 
        user: User, 
        file: UploadFile, 
        caption: Optional[str] = None
    ) -> EventPhoto:
        # Check event and permissions
        event_res = await self.db.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if event.created_by != user.id:
            raise HTTPException(status_code=403, detail="Permission denied")

        # Check photo limit
        count_res = await self.db.execute(
            select(EventPhoto).where(EventPhoto.event_id == event_id)
        )
        if len(count_res.scalars().all()) >= 8:
            raise HTTPException(status_code=400, detail="Maximum 8 photos allowed")

        # Validate file
        if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(status_code=400, detail="Invalid file type")
        
        # Max 5MB
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")

        # Save file
        file_ext = file.filename.split(".")[-1]
        file_name = f"{uuid.uuid4()}.{file_ext}"
        relative_path = f"events/{event_id}/{file_name}"
        await self.storage.save_file(file, relative_path)

        # Create record
        photo = EventPhoto(
            event_id=event_id,
            file_path=relative_path,
            original_filename=file.filename,
            caption=caption,
            display_order=0 # Will be sorted later or set to max
        )
        self.db.add(photo)
        await self.db.commit()
        await self.db.refresh(photo)
        return photo

    async def get_event_photos(self, event_id: UUID) -> List[EventPhoto]:
        result = await self.db.execute(
            select(EventPhoto)
            .where(EventPhoto.event_id == event_id)
            .order_by(EventPhoto.display_order)
        )
        return list(result.scalars().all())

    async def delete_photo(self, photo_id: UUID, user: User):
        result = await self.db.execute(
            select(EventPhoto).options(joinedload(EventPhoto.event)).where(EventPhoto.id == photo_id)
        )
        photo = result.scalar_one_or_none()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        if photo.event.created_by != user.id:
            raise HTTPException(status_code=403, detail="Permission denied")

        await self.storage.delete_file(photo.file_path)
        await self.db.delete(photo)
        await self.db.commit()

    async def set_cover_photo(self, photo_id: UUID, user: User) -> EventPhoto:
        result = await self.db.execute(
            select(EventPhoto).options(joinedload(EventPhoto.event)).where(EventPhoto.id == photo_id)
        )
        photo = result.scalar_one_or_none()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        if photo.event.created_by != user.id:
            raise HTTPException(status_code=403, detail="Permission denied")

        # Reset all others
        await self.db.execute(
            update(EventPhoto)
            .where(EventPhoto.event_id == photo.event_id)
            .values(is_cover=False)
        )
        
        photo.is_cover = True
        await self.db.commit()
        await self.db.refresh(photo)
        return photo

    async def reorder_photos(self, event_id: UUID, photo_ids: List[UUID], user: User):
        event_res = await self.db.execute(select(Event).where(Event.id == event_id))
        event = event_res.scalar_one_or_none()
        if not event or event.created_by != user.id:
            raise HTTPException(status_code=403, detail="Permission denied")

        for index, photo_id in enumerate(photo_ids):
            await self.db.execute(
                update(EventPhoto)
                .where(EventPhoto.id == photo_id, EventPhoto.event_id == event_id)
                .values(display_order=index)
            )
        await self.db.commit()
