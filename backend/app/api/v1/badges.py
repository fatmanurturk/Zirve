from __future__ import annotations

from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.badge import Badge, BadgeCategory, UserBadge
from app.models.user import User, UserRole
from app.schemas.badge import (
    AwardBadgeRequest,
    BadgeCreate,
    BadgeListResponse,
    BadgeResponse,
    BadgeUpdate,
    UserBadgeResponse,
)
from app.services.badge_service import BadgeService

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


def _require_organizer(current_user: User) -> None:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yalnizca organizatorler bu islemi yapabilir.",
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
    total = await db.scalar(count_query) or 0
    badges: List[Badge] = (await db.execute(query.offset(skip).limit(limit))).scalars().all()
    return BadgeListResponse(items=[_badge_to_response(b) for b in badges], total=int(total))


@router.get("/badges/{badge_id}", response_model=BadgeResponse)
async def get_badge(badge_id: UUID, db: DbSessionDep) -> BadgeResponse:
    badge = await db.scalar(select(Badge).where(Badge.id == badge_id))
    if badge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rozet bulunamadi.")
    return _badge_to_response(badge)


@router.post("/badges/", response_model=BadgeResponse, status_code=status.HTTP_201_CREATED)
async def create_badge(
    badge_in: BadgeCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> BadgeResponse:
    _require_organizer(current_user)
    try:
        badge = await BadgeService(db).create(badge_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return _badge_to_response(badge)


@router.put("/badges/{badge_id}", response_model=BadgeResponse)
async def update_badge(
    badge_id: UUID,
    badge_in: BadgeUpdate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> BadgeResponse:
    _require_organizer(current_user)
    badge = await db.scalar(select(Badge).where(Badge.id == badge_id))
    if badge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rozet bulunamadi.")
    try:
        badge = await BadgeService(db).update(badge, badge_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return _badge_to_response(badge)


@router.delete("/badges/{badge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_badge(
    badge_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> Response:
    _require_organizer(current_user)
    badge = await db.scalar(select(Badge).where(Badge.id == badge_id))
    if badge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rozet bulunamadi.")
    await BadgeService(db).delete(badge)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/badges/award", response_model=UserBadgeResponse, status_code=status.HTTP_201_CREATED)
async def award_badge(
    payload: AwardBadgeRequest,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> UserBadgeResponse:
    _require_organizer(current_user)

    try:
        user_id = UUID(payload.user_id)
        badge_id = UUID(payload.badge_id)
        event_id = UUID(payload.earned_from_event_id) if payload.earned_from_event_id else None
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Gecersiz UUID formati.")

    try:
        user_badge, badge = await BadgeService(db).award(user_id, badge_id, event_id)
    except ValueError as e:
        detail = str(e)
        code = status.HTTP_409_CONFLICT if "zaten" in detail else status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code=code, detail=detail)

    return _user_badge_to_response(user_badge, badge)
