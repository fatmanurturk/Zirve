from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.application import Application, ApplicationStatus
from app.models.event import Event, EventStatus, EventDifficulty
from app.models.volunteer import VolunteerProfile
from app.models.user import User, UserRole
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationStatusUpdate,
)

router = APIRouter(tags=["applications"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]

DIFFICULTY_SCORES = {
    EventDifficulty.EASY: 10,
    EventDifficulty.MEDIUM: 20,
    EventDifficulty.HARD: 50,
    EventDifficulty.EXPERT: 100,
}


def _app_to_response(app: Application) -> ApplicationResponse:
    return ApplicationResponse.model_validate(app)


@router.post("/events/{event_id}/apply", response_model=ApplicationResponse, status_code=201)
async def apply_to_event(
    event_id: UUID,
    body: ApplicationCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> ApplicationResponse:
    if current_user.role != UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Sadece gonulluler basvurabilir.")
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadi.")
    if event.status != EventStatus.OPEN:
        raise HTTPException(status_code=400, detail="Bu etkinlik basvuruya acik degil.")
    existing = await db.execute(
        select(Application).where(
            Application.event_id == event_id,
            Application.volunteer_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Bu etkinlige zaten basvurdunuz.")
    application = Application(
        event_id=event_id,
        volunteer_id=current_user.id,
        motivation_letter=body.motivation_letter,
        status=ApplicationStatus.PENDING,
        checked_in=False,
        applied_at=datetime.now(timezone.utc),
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    return _app_to_response(application)


@router.delete("/events/{event_id}/apply", status_code=204)
async def withdraw_application(
    event_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> Response:
    result = await db.execute(
        select(Application).where(
            Application.event_id == event_id,
            Application.volunteer_id == current_user.id,
        )
    )
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Basvuru bulunamadi.")
    if application.status == ApplicationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Onaylanmis basvuru geri cekilemez.")
    await db.delete(application)
    await db.commit()
    return Response(status_code=204)


@router.get("/events/{event_id}/applications", response_model=ApplicationListResponse)
async def list_event_applications(
    event_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
    app_status: Optional[ApplicationStatus] = None,
    skip: int = 0,
    limit: int = 20,
) -> ApplicationListResponse:
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadi.")
    if str(event.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sadece etkinlik sahibi gorebilir.")
    query = select(Application).where(Application.event_id == event_id)
    count_query = select(func.count()).select_from(Application).where(Application.event_id == event_id)
    if app_status is not None:
        query = query.where(Application.status == app_status)
        count_query = count_query.where(Application.status == app_status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    applications = result.scalars().all()
    return ApplicationListResponse(items=[_app_to_response(a) for a in applications], total=int(total))


@router.put("/events/{event_id}/applications/{application_id}", response_model=ApplicationResponse)
async def update_application_status(
    event_id: UUID,
    application_id: UUID,
    body: ApplicationStatusUpdate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> ApplicationResponse:
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadi.")
    if str(event.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Sadece etkinlik sahibi guncelleyebilir.")
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.event_id == event_id,
        )
    )
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Basvuru bulunamadi.")
    application.status = body.status
    if body.reviewer_note is not None:
        application.reviewer_note = body.reviewer_note
    await db.commit()
    await db.refresh(application)
    return _app_to_response(application)


@router.get("/users/me/applications", response_model=ApplicationListResponse)
async def my_applications(
    db: DbSessionDep,
    current_user: CurrentUserDep,
    app_status: Optional[ApplicationStatus] = None,
    skip: int = 0,
    limit: int = 20,
) -> ApplicationListResponse:
    if current_user.role != UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Sadece gonulluler kendi basvurularini gorebilir.")
    query = select(Application).where(Application.volunteer_id == current_user.id)
    count_query = select(func.count()).select_from(Application).where(Application.volunteer_id == current_user.id)
    if app_status is not None:
        query = query.where(Application.status == app_status)
        count_query = count_query.where(Application.status == app_status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    applications = result.scalars().all()
    return ApplicationListResponse(items=[_app_to_response(a) for a in applications], total=int(total))


@router.post("/events/{event_id}/applications/{application_id}/checkin", response_model=ApplicationResponse)
async def checkin_application(
    event_id: UUID,
    application_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> ApplicationResponse:
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadi.")
    if str(event.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Bu islem icin yetkiniz yok.")
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.event_id == event_id,
        )
    )
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Basvuru bulunamadi.")
    if application.status != ApplicationStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Sadece onaylı basvurular check-in yapilabilir.")
    if application.checked_in:
        raise HTTPException(status_code=409, detail="Bu gonullu zaten check-in yapildi.")
    
    application.checked_in = True
    application.checked_in_at = datetime.now(timezone.utc)
    
    # Add impact score
    score_to_add = DIFFICULTY_SCORES.get(event.difficulty, 0)
    profile_result = await db.execute(
        select(VolunteerProfile).where(VolunteerProfile.user_id == application.volunteer_id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile:
        profile.total_impact_score = (profile.total_impact_score or 0) + score_to_add
        
    await db.commit()
    await db.refresh(application)
    return _app_to_response(application)


@router.delete("/events/{event_id}/applications/{application_id}/checkin", response_model=ApplicationResponse)
async def undo_checkin(
    event_id: UUID,
    application_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> ApplicationResponse:
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadi.")
    if str(event.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Bu islem icin yetkiniz yok.")
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.event_id == event_id,
        )
    )
    application = result.scalar_one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Basvuru bulunamadi.")
    if not application.checked_in:
        raise HTTPException(status_code=400, detail="Bu gonullu zaten check-in yapilmadi.")
        
    application.checked_in = False
    application.checked_in_at = None
    
    # Deduct impact score
    score_to_deduct = DIFFICULTY_SCORES.get(event.difficulty, 0)
    profile_result = await db.execute(
        select(VolunteerProfile).where(VolunteerProfile.user_id == application.volunteer_id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile:
        profile.total_impact_score = max(0, (profile.total_impact_score or 0) - score_to_deduct)
        
    await db.commit()
    await db.refresh(application)
    return _app_to_response(application)


@router.get("/events/{event_id}/checkins", response_model=ApplicationListResponse)
async def list_checkins(
    event_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
    skip: int = 0,
    limit: int = 20,
) -> ApplicationListResponse:
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadi.")
    if str(event.created_by) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Bu islem icin yetkiniz yok.")
    count_result = await db.execute(
        select(func.count()).select_from(Application).where(
            Application.event_id == event_id,
            Application.checked_in.is_(True),
        )
    )
    total = count_result.scalar_one() or 0
    result = await db.execute(
        select(Application).where(
            Application.event_id == event_id,
            Application.checked_in.is_(True),
        ).offset(skip).limit(limit)
    )
    applications = result.scalars().all()
    return ApplicationListResponse(items=[_app_to_response(a) for a in applications], total=int(total))