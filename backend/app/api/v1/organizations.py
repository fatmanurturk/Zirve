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
from app.models.user import User, UserRole
from app.schemas.event import EventListResponse, EventResponse
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    OrganizationWithEventsResponse,
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


@router.get("/organizations/{org_id}", response_model=OrganizationWithEventsResponse)
async def get_organization(
    org_id: UUID,
    db: DbSessionDep,
) -> OrganizationWithEventsResponse:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    count_result = await db.execute(
        select(func.count()).select_from(Event).where(Event.organization_id == org_id)
    )
    event_count = count_result.scalar_one() or 0
    return OrganizationWithEventsResponse(
        **_org_to_response(org).model_dump(),
        event_count=int(event_count),
    )


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