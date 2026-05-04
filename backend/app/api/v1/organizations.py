from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.event import Event, EventStatus
from app.models.organization import Organization
from app.models.organization_follower import OrganizationFollower
from app.models.user import User, UserRole
from app.models.application import Application, ApplicationStatus
from app.schemas.event import EventListResponse, EventResponse
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    OrganizationWithEventsResponse,
    OrganizationProfileResponse,
    OrganizationStats,
)

router = APIRouter(tags=["organizations"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


def _org_to_response(org: Organization) -> OrganizationResponse:
    return OrganizationResponse.model_validate(org)


def _event_to_response(event: Event) -> EventResponse:
    return EventResponse.model_validate(event)


@router.post("/organizations/", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    body: OrganizationCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> OrganizationResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Sadece organizatorler organizasyon olusturabilir.")
    existing = await db.execute(
        select(Organization).where(Organization.owner_id == current_user.id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Zaten bir organizasyonunuz var.")
    org = Organization(
        owner_id=current_user.id,
        name=body.name,
        description=body.description,
        logo_url=body.logo_url,
        website=body.website,
        city=body.city,
        category=body.category,
        tags=body.tags,
        is_verified=False,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return _org_to_response(org)


@router.get("/organizations/me", response_model=OrganizationResponse)
async def get_my_organization(
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> OrganizationResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Sadece organizatorler erisebilir.")
    result = await db.execute(
        select(Organization).where(Organization.owner_id == current_user.id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    return _org_to_response(org)


@router.put("/organizations/me", response_model=OrganizationResponse)
async def update_my_organization(
    body: OrganizationUpdate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> OrganizationResponse:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Sadece organizatorler erisebilir.")
    result = await db.execute(
        select(Organization).where(Organization.owner_id == current_user.id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    await db.commit()
    await db.refresh(org)
    return _org_to_response(org)


@router.delete("/organizations/me", status_code=204)
async def delete_my_organization(
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> Response:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Sadece organizatorler erisebilir.")
    result = await db.execute(
        select(Organization).where(Organization.owner_id == current_user.id)
    )
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    await db.delete(org)
    await db.commit()
    return Response(status_code=204)


@router.get("/organizations/{org_id}", response_model=OrganizationProfileResponse)
async def get_organization(
    org_id: UUID,
    db: DbSessionDep,
) -> OrganizationProfileResponse:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    
    # Calculate stats
    followers_result = await db.execute(select(func.count()).select_from(OrganizationFollower).where(OrganizationFollower.organization_id == org_id))
    followers_count = followers_result.scalar_one() or 0

    completed_events_result = await db.execute(select(func.count()).select_from(Event).where(Event.organization_id == org_id).where(Event.status == EventStatus.COMPLETED))
    completed_events_count = completed_events_result.scalar_one() or 0

    # For active volunteers, count approved applications for this org's events
    active_volunteers_result = await db.execute(
        select(func.count()).select_from(Application)
        .join(Event, Application.event_id == Event.id)
        .where(Event.organization_id == org_id)
        .where(Application.status == ApplicationStatus.APPROVED)
    )
    active_volunteers_count = active_volunteers_result.scalar_one() or 0

    # Mock total hours for now
    total_hours = completed_events_count * 5 * active_volunteers_count

    stats = OrganizationStats(
        followers=int(followers_count),
        active_volunteers=int(active_volunteers_count),
        completed_events=int(completed_events_count),
        total_hours=total_hours
    )

    return OrganizationProfileResponse(
        **_org_to_response(org).model_dump(),
        stats=stats
    )

@router.post("/organizations/{org_id}/follow", status_code=200)
async def toggle_follow_organization(
    org_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
):
    # Check if org exists
    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")

    # Check if follow exists
    existing_follow = await db.execute(
        select(OrganizationFollower)
        .where(OrganizationFollower.organization_id == org_id)
        .where(OrganizationFollower.user_id == current_user.id)
    )
    follow = existing_follow.scalar_one_or_none()

    if follow:
        # Unfollow
        await db.delete(follow)
        await db.commit()
        return {"status": "unfollowed"}
    else:
        # Follow
        new_follow = OrganizationFollower(
            user_id=current_user.id,
            organization_id=org_id
        )
        db.add(new_follow)
        await db.commit()
        return {"status": "followed"}


@router.get("/organizations/{org_id}/events", response_model=EventListResponse)
async def get_organization_events(
    org_id: UUID,
    db: DbSessionDep,
    app_status: Optional[EventStatus] = None,
    skip: int = 0,
    limit: int = 20,
) -> EventListResponse:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    query = select(Event).where(Event.organization_id == org_id)
    count_query = select(func.count()).select_from(Event).where(Event.organization_id == org_id)
    if app_status is not None:
        query = query.where(Event.status == app_status)
        count_query = count_query.where(Event.status == app_status)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one() or 0
    events_result = await db.execute(query.offset(skip).limit(limit))
    events = events_result.scalars().all()
    return EventListResponse(items=[_event_to_response(e) for e in events], total=int(total))