from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.application import Application, ApplicationStatus
from app.models.badge import UserBadge
from app.models.user import User, UserRole
from app.models.volunteer import VolunteerEquipment, VolunteerProfile
from app.schemas.volunteer import (
    EquipmentCreate,
    PublicProfileResponse,
    UserStatsResponse,
    VolunteerEquipmentResponse,
    VolunteerProfileCreate,
    VolunteerProfileResponse,
    VolunteerProfileUpdate,
)

router = APIRouter(tags=["volunteers"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]


def _equipment_to_response(eq: VolunteerEquipment) -> VolunteerEquipmentResponse:
    return VolunteerEquipmentResponse.model_validate(eq)


def _profile_to_response(profile: VolunteerProfile) -> VolunteerProfileResponse:
    return VolunteerProfileResponse.model_validate(profile)


@router.post("/volunteers/me/profile", response_model=VolunteerProfileResponse, status_code=201)
async def create_profile(
    body: VolunteerProfileCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> VolunteerProfileResponse:
    if current_user.role != UserRole.VOLUNTEER:
        raise HTTPException(status_code=403, detail="Sadece gonulluler profil olusturabilir.")
    existing = await db.execute(
        select(VolunteerProfile).where(VolunteerProfile.user_id == current_user.id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Profiliniz zaten mevcut.")
    profile = VolunteerProfile(
        user_id=current_user.id,
        bio=body.bio,
        experience_level=body.experience_level,
        max_altitude_m=body.max_altitude_m,
        city=body.city,
        emergency_contact=body.emergency_contact,
        total_impact_score=0,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    result = await db.execute(
        select(VolunteerProfile)
        .options(selectinload(VolunteerProfile.equipment_list))
        .where(VolunteerProfile.user_id == current_user.id)
    )
    loaded_profile = result.scalar_one()
    return _profile_to_response(loaded_profile)


@router.get("/volunteers/me/profile", response_model=VolunteerProfileResponse)
async def get_my_profile(
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> VolunteerProfileResponse:
    result = await db.execute(
        select(VolunteerProfile)
        .options(selectinload(VolunteerProfile.equipment_list))
        .where(VolunteerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profil bulunamadi.")
    return _profile_to_response(profile)


@router.put("/volunteers/me/profile", response_model=VolunteerProfileResponse)
async def update_my_profile(
    body: VolunteerProfileUpdate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> VolunteerProfileResponse:
    result = await db.execute(
        select(VolunteerProfile)
        .options(selectinload(VolunteerProfile.equipment_list))
        .where(VolunteerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profil bulunamadi.")
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return _profile_to_response(profile)


@router.post("/volunteers/me/equipment", response_model=VolunteerEquipmentResponse, status_code=201)
async def add_equipment(
    body: EquipmentCreate,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> VolunteerEquipmentResponse:
    result = await db.execute(
        select(VolunteerProfile).where(VolunteerProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Once profil olusturun.")
    equipment = VolunteerEquipment(
        volunteer_id=profile.id,
        equipment_type=body.equipment_type,
        brand=body.brand,
        condition=body.condition,
        verified=False,
    )
    db.add(equipment)
    await db.commit()
    await db.refresh(equipment)
    return _equipment_to_response(equipment)


@router.delete("/volunteers/me/equipment/{equipment_id}", status_code=204)
async def delete_equipment(
    equipment_id: UUID,
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> Response:
    profile_result = await db.execute(
        select(VolunteerProfile).where(VolunteerProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profil bulunamadi.")
    eq_result = await db.execute(
        select(VolunteerEquipment).where(
            VolunteerEquipment.id == equipment_id,
            VolunteerEquipment.volunteer_id == profile.id,
        )
    )
    equipment = eq_result.scalar_one_or_none()
    if equipment is None:
        raise HTTPException(status_code=404, detail="Ekipman bulunamadi.")
    await db.delete(equipment)
    await db.commit()
    return Response(status_code=204)


@router.get("/volunteers/me/stats", response_model=UserStatsResponse)
async def get_my_stats(
    db: DbSessionDep,
    current_user: CurrentUserDep,
) -> UserStatsResponse:
    total_result = await db.execute(
        select(func.count()).select_from(Application).where(
            Application.volunteer_id == current_user.id
        )
    )
    total_applications = total_result.scalar_one() or 0

    approved_result = await db.execute(
        select(func.count()).select_from(Application).where(
            Application.volunteer_id == current_user.id,
            Application.status == ApplicationStatus.APPROVED,
        )
    )
    approved_applications = approved_result.scalar_one() or 0

    checkin_result = await db.execute(
        select(func.count()).select_from(Application).where(
            Application.volunteer_id == current_user.id,
            Application.checked_in.is_(True),
        )
    )
    checked_in_count = checkin_result.scalar_one() or 0

    badge_result = await db.execute(
        select(func.count()).select_from(UserBadge).where(
            UserBadge.user_id == current_user.id
        )
    )
    badge_count = badge_result.scalar_one() or 0

    profile_result = await db.execute(
        select(VolunteerProfile).where(VolunteerProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    total_impact_score = profile.total_impact_score if profile else 0

    return UserStatsResponse(
        total_applications=int(total_applications),
        approved_applications=int(approved_applications),
        checked_in_count=int(checked_in_count),
        total_impact_score=int(total_impact_score),
        badge_count=int(badge_count),
    )


@router.get("/volunteers/{user_id}/profile", response_model=PublicProfileResponse)
async def get_public_profile(
    user_id: UUID,
    db: DbSessionDep,
) -> PublicProfileResponse:
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi.")
    profile_result = await db.execute(
        select(VolunteerProfile).where(VolunteerProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Profil bulunamadi.")
    badge_result = await db.execute(
        select(func.count()).select_from(UserBadge).where(UserBadge.user_id == user_id)
    )
    badge_count = badge_result.scalar_one() or 0
    return PublicProfileResponse(
        user_id=user.id,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        city=profile.city,
        experience_level=profile.experience_level,
        total_impact_score=profile.total_impact_score,
        badge_count=int(badge_count),
    )