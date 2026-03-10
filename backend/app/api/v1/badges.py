from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.badge import Badge, BadgeCategory, UserBadge
from app.models.event import Event
from app.models.user import User, UserRole
from app.schemas.badge import (
    AwardBadgeRequest,
    BadgeCreate,
    BadgeListResponse,
    BadgeResponse,
    BadgeUpdate,
    UserBadgeResponse,
)

router = APIRouter(tags=["badges"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


def _badge_to_response(badge: Badge) -> BadgeResponse:
    return BadgeResponse.model_validate(badge)


def _user_badge_to_response(user_badge: UserBadge, badge: Badge) -> UserBadgeResponse:
    return UserBadgeResponse(
        id=user_badge.id,
        user_id=user_badge.user_id,
        badge_id=user_badge.badge_id,
        earned_from_event_id=user_badge.earned_from_event_id,
        earned_at=user_badge.earned_at,
        badge=_badge_to_response(badge),
    )


@router.get("/badges/", response_model=BadgeListResponse)
async def list_badges(
    db: DbSessionDep,
    category: Optional[BadgeCategory] = Query(default=None),
    skip: int = 0,
    limit: int = 20,
) -> BadgeListResponse:
    query = select(Badge)
    count_query = select(func.count()).select_from(Badge)
    if category is not None:
        query = query.where(Badge.category == category)
        count_query = count_query.where(Badge.category == category)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    badges: List[Badge] = result.scalars().all()
    return BadgeListResponse(items=[_badge_to_response(b) for b in badges], total=int(total))


@router.get("/badges/{badge_id}", response_model=BadgeResponse)
async def get_badge(
    badge_id: UUID,
    db: DbSessionDep,
) -> BadgeResponse:
    result = await db.execute(select(Badge).where(Badge.id == badge_id))
    badge = result.scalar_one_or_none()
    if badge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rozet bulunamadi.")
    return _badge_to_response(badge)


@router.post("/badges/", response_model=BadgeResponse, status_code=status.HTTP_201_CREATED)
async def create_badge(
    badge_in: BadgeCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> BadgeResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yalnizca organizatorler rozet olusturabilir.")
    existing = await db.execute(select(Badge).where(Badge.name == badge_in.name))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu isimde bir rozet zaten mevcut.")
    badge = Badge(
        name=badge_in.name,
        description=badge_in.description,
        icon_url=badge_in.icon_url,
        category=badge_in.category,
        criteria=badge_in.criteria,
        score_threshold=badge_in.score_threshold,
    )
    db.add(badge)
    await db.commit()
    await db.refresh(badge)
    return _badge_to_response(badge)


@router.put("/badges/{badge_id}", response_model=BadgeResponse)
async def update_badge(
    badge_id: UUID,
    badge_in: BadgeUpdate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> BadgeResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yalnizca organizatorler rozet guncelleyebilir.")
    result = await db.execute(select(Badge).where(Badge.id == badge_id))
    badge = result.scalar_one_or_none()
    if badge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rozet bulunamadi.")
    update_data = badge_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] is not None:
        name_check = await db.execute(
            select(Badge).where(Badge.name == update_data["name"], Badge.id != badge.id)
        )
        if name_check.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu isimde bir rozet zaten mevcut.")
    for field, value in update_data.items():
        setattr(badge, field, value)
    await db.commit()
    await db.refresh(badge)
    return _badge_to_response(badge)


@router.delete("/badges/{badge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_badge(
    badge_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> Response:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yalnizca organizatorler rozet silebilir.")
    result = await db.execute(select(Badge).where(Badge.id == badge_id))
    badge = result.scalar_one_or_none()
    if badge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rozet bulunamadi.")
    await db.delete(badge)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/badges/award", response_model=UserBadgeResponse, status_code=status.HTTP_201_CREATED)
async def award_badge(
    payload: AwardBadgeRequest,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> UserBadgeResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yalnizca organizatorler rozet atayabilir.")
    try:
        user_id = UUID(payload.user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gecersiz kullanici id.")
    try:
        badge_id = UUID(payload.badge_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gecersiz rozet id.")
    earned_from_event_id: Optional[UUID] = None
    if payload.earned_from_event_id is not None:
        try:
            earned_from_event_id = UUID(payload.earned_from_event_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gecersiz etkinlik id.")
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    badge_result = await db.execute(select(Badge).where(Badge.id == badge_id))
    badge = badge_result.scalar_one_or_none()
    if badge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rozet bulunamadi.")
    if earned_from_event_id is not None:
        event_result = await db.execute(select(Event).where(Event.id == earned_from_event_id))
        if event_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Etkinlik bulunamadi.")
    existing_result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == user.id, UserBadge.badge_id == badge.id)
    )
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu rozet kullaniciya zaten verilmis.")
    user_badge = UserBadge(
        user_id=user.id,
        badge_id=badge.id,
        earned_from_event_id=earned_from_event_id,
        earned_at=datetime.now(timezone.utc),
    )
    db.add(user_badge)
    await db.commit()
    await db.refresh(user_badge)
    return _user_badge_to_response(user_badge, badge)
