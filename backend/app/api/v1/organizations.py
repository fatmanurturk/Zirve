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
    OrganizationProfileResponse,
    OrganizationResponse,
    OrganizationUpdate,
)
from app.services.organization_service import OrganizationService

router = APIRouter(tags=["organizations"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


def _org_to_response(org: Organization) -> OrganizationResponse:
    return OrganizationResponse.model_validate(org)


def _event_to_response(event: Event) -> EventResponse:
    return EventResponse.model_validate(event)


def _require_organizer(current_user: User) -> None:
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Sadece organizatorler erisebilir.")


@router.post("/organizations/", response_model=OrganizationResponse, status_code=201)
async def create_organization(
    body: OrganizationCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> OrganizationResponse:
    _require_organizer(current_user)
    try:
        org = await OrganizationService(db).create(current_user.id, body)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return _org_to_response(org)


@router.get("/organizations/me", response_model=OrganizationResponse)
async def get_my_organization(
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> OrganizationResponse:
    _require_organizer(current_user)
    org = await OrganizationService(db).get_by_owner(current_user.id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    return _org_to_response(org)


@router.put("/organizations/me", response_model=OrganizationResponse)
async def update_my_organization(
    body: OrganizationUpdate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> OrganizationResponse:
    _require_organizer(current_user)
    svc = OrganizationService(db)
    org = await svc.get_by_owner(current_user.id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    org = await svc.update(org, body)
    return _org_to_response(org)


@router.delete("/organizations/me", status_code=204)
async def delete_my_organization(
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> Response:
    _require_organizer(current_user)
    svc = OrganizationService(db)
    org = await svc.get_by_owner(current_user.id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    await svc.delete(org)
    return Response(status_code=204)


@router.get("/organizations/{org_id}", response_model=OrganizationProfileResponse)
async def get_organization(
    org_id: UUID,
    db: DbSessionDep,
) -> OrganizationProfileResponse:
    svc = OrganizationService(db)
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    stats = await svc.get_stats(org_id)
    return OrganizationProfileResponse(**_org_to_response(org).model_dump(), stats=stats)


@router.post("/organizations/{org_id}/follow", status_code=200)
async def toggle_follow_organization(
    org_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
):
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")
    result = await OrganizationService(db).toggle_follow(org_id, current_user.id)
    return {"status": result}


@router.get("/organizations/{org_id}/events", response_model=EventListResponse)
async def get_organization_events(
    org_id: UUID,
    db: DbSessionDep,
    app_status: Optional[EventStatus] = None,
    skip: int = 0,
    limit: int = 20,
) -> EventListResponse:
    org = await db.scalar(select(Organization).where(Organization.id == org_id))
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadi.")

    query = select(Event).where(Event.organization_id == org_id)
    count_query = select(func.count()).select_from(Event).where(Event.organization_id == org_id)
    if app_status is not None:
        query = query.where(Event.status == app_status)
        count_query = count_query.where(Event.status == app_status)

    total = await db.scalar(count_query) or 0
    events = (await db.execute(query.offset(skip).limit(limit))).scalars().all()
    return EventListResponse(items=[_event_to_response(e) for e in events], total=int(total))
