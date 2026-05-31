from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from decimal import Decimal

from app.adapters.vakifbank_adapter import get_payment_gateway
from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.application import Application, ApplicationStatus
from app.models.event import Event, EventStatus, EventDifficulty
from app.models.user import User, UserRole
from app.schemas.payment import CreatePaymentDto
from app.services.payment_service import PaymentService
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationStatusUpdate,
)
from app.services.application_service import ApplicationService

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
    if event.end_date.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Bu etkinligin tarihi gecmis, basvuru yapilamaz.")
    existing = await db.execute(
        select(Application).where(
            Application.event_id == event_id,
            Application.volunteer_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Bu etkinlige zaten basvurdunuz.")

    # Ücretli etkinlik — ödeme önce alınır, başarısız olursa başvuru oluşturulmaz
    if event.fee and Decimal(str(event.fee)) > Decimal("0.00"):
        if not all([body.card_number, body.card_holder_name, body.expiry_month, body.expiry_year, body.cvv]):
            raise HTTPException(
                status_code=400,
                detail="Bu etkinliğin katılım ücreti var. Lütfen kart bilgilerinizi girin.",
            )
        try:
            gateway = get_payment_gateway()
            await PaymentService(db, gateway).process_payment(
                CreatePaymentDto(
                    amount=Decimal(str(event.fee)),
                    currency="TRY",
                    card_number=body.card_number,
                    card_holder_name=body.card_holder_name,
                    expiry_month=body.expiry_month,
                    expiry_year=body.expiry_year,
                    cvv=body.cvv,
                    extra_data={"event_id": str(event_id), "volunteer_id": str(current_user.id)},
                )
            )
        except ValueError as e:
            raise HTTPException(status_code=402, detail=str(e))

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
    if event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece etkinlik sahibi gorebilir.")
    query = (
        select(Application, User.full_name, User.avatar_url)
        .join(User, Application.volunteer_id == User.id)
        .where(Application.event_id == event_id)
    )
    count_query = select(func.count()).select_from(Application).where(Application.event_id == event_id)
    if app_status is not None:
        query = query.where(Application.status == app_status)
        count_query = count_query.where(Application.status == app_status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    rows = result.all()
    
    items = []
    for app, name, avatar in rows:
        resp = _app_to_response(app)
        resp.volunteer_name = name
        resp.volunteer_avatar_url = avatar
        items.append(resp)
        
    return ApplicationListResponse(items=items, total=int(total))


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
    if event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece etkinlik sahibi guncelleyebilir.")
    result = await db.execute(
        select(Application, User.full_name, User.avatar_url)
        .join(User, Application.volunteer_id == User.id)
        .where(
            Application.id == application_id,
            Application.event_id == event_id,
        )
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Basvuru bulunamadi.")
    
    application, name, avatar = row
    application.status = body.status
    if body.reviewer_note is not None:
        application.reviewer_note = body.reviewer_note
    
    await db.commit()
    await db.refresh(application)
    
    resp = _app_to_response(application)
    resp.volunteer_name = name
    resp.volunteer_avatar_url = avatar
    return resp


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
    query = (
        select(Application, Event)
        .join(Event, Application.event_id == Event.id)
        .where(Application.volunteer_id == current_user.id)
        .order_by(Application.applied_at.desc())
    )
    count_query = select(func.count()).select_from(Application).where(Application.volunteer_id == current_user.id)
    if app_status is not None:
        query = query.where(Application.status == app_status)
        count_query = count_query.where(Application.status == app_status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    rows = result.all()
    items = []
    for app, event in rows:
        resp = _app_to_response(app)
        resp.event_title = event.title
        resp.event_start_date = event.start_date
        resp.event_location_name = event.location_name
        resp.event_category = event.category.value if event.category else None
        resp.event_difficulty = event.difficulty.value if event.difficulty else None
        items.append(resp)
    return ApplicationListResponse(items=items, total=int(total))


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
    if event.created_by != current_user.id:
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

    try:
        svc = ApplicationService(db)
        application = await svc.checkin(application, event)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    if event.created_by != current_user.id:
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

    try:
        svc = ApplicationService(db)
        application = await svc.undo_checkin(application, event)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    if event.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Bu islem icin yetkiniz yok.")
    count_result = await db.execute(
        select(func.count()).select_from(Application).where(
            Application.event_id == event_id,
            Application.checked_in.is_(True),
        )
    )
    total = count_result.scalar_one() or 0
    result = await db.execute(
        select(Application, User.full_name, User.avatar_url)
        .join(User, Application.volunteer_id == User.id)
        .where(
            Application.event_id == event_id,
            Application.checked_in.is_(True),
        ).offset(skip).limit(limit)
    )
    rows = result.all()
    items = []
    for app, name, avatar in rows:
        resp = _app_to_response(app)
        resp.volunteer_name = name
        resp.volunteer_avatar_url = avatar
        items.append(resp)
    return ApplicationListResponse(items=items, total=int(total))