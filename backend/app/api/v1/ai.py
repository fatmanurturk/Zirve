from __future__ import annotations

from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user, get_optional_user
from app.db.base import get_db
from app.models.application import Application, ApplicationStatus
from app.models.event import Event, EventStatus
from app.models.user import User
from app.models.volunteer import VolunteerProfile
from app.schemas.ai import AIIntentResponse, AIQueryRequest, AIRecommendResponse, EventRecommendation
from app.services.ai_service import (
    build_event_summary,
    build_profile_summary,
    build_user_context,
    get_recommendations,
    search_events,
    _CATEGORY_TR,
    _DIFFICULTY_TR,
)
from app.services.chatbot_service import (
    extract_intent,
    generate_full_chat_response,
    generate_recommendation_text,
    generate_search_response,
)

router = APIRouter(tags=["ai"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]
OptionalUserDep = Annotated[Optional[User], Depends(get_optional_user)]


# ---------- Panel chat şemaları (HTTP katmanına ait) ----------

class AIChatHistoryItem(BaseModel):
    role: str
    content: str


class AIChatPanelRequest(BaseModel):
    message: str
    mode: str = "general"
    history: list[AIChatHistoryItem] = []


class AIChatPanelResponse(BaseModel):
    reply: str


# ---------- Endpoint'ler ----------

@router.post("/ai/intent", response_model=AIIntentResponse, status_code=status.HTTP_200_OK)
async def ai_intent(payload: AIQueryRequest, db: DbSessionDep) -> AIIntentResponse:
    result = await extract_intent(payload.message)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=result["error"])

    city = result.get("city")
    activity = result.get("activity")
    difficulty = result.get("difficulty")

    events = await search_events(db, payload.message, city, activity, difficulty)
    model_text = await generate_search_response(
        user_message=payload.message,
        city=city,
        activity=activity,
        difficulty=difficulty,
        events=events,
    )
    return AIIntentResponse(city=city, activity=activity, model_text=model_text)


@router.get("/ai/recommend", response_model=AIRecommendResponse, status_code=status.HTTP_200_OK)
async def ai_recommend(db: DbSessionDep, current_user: CurrentUserDep) -> AIRecommendResponse:
    profile = await db.scalar(
        select(VolunteerProfile)
        .options(selectinload(VolunteerProfile.equipment_list))
        .where(VolunteerProfile.user_id == current_user.id)
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Öneri alabilmek için önce gönüllü profilinizi oluşturun.",
        )

    past_apps = (
        await db.execute(
            select(Application)
            .options(selectinload(Application.event))
            .where(
                Application.volunteer_id == current_user.id,
                Application.status == ApplicationStatus.APPROVED,
            )
        )
    ).scalars().all()
    past_events = [a.event for a in past_apps if a.event]

    open_events = (
        await db.execute(
            select(Event).where(Event.status == EventStatus.OPEN).order_by(Event.start_date).limit(50)
        )
    ).scalars().all()

    user_summary = build_profile_summary(profile, past_events)

    if not open_events:
        return AIRecommendResponse(
            recommendations=[],
            profile_summary=user_summary,
            model_text="Şu an açık etkinlik bulunmuyor. Daha sonra tekrar kontrol edin.",
        )

    event_dicts = [
        {
            "id": str(e.id),
            "title": e.title,
            "category": _CATEGORY_TR.get(e.category.value, e.category.value),
            "difficulty": _DIFFICULTY_TR.get(e.difficulty.value, e.difficulty.value),
            "location_name": e.location_name,
            "start_date": e.start_date.isoformat(),
            "description": e.description,
            "summary": build_event_summary(e),
        }
        for e in open_events
    ]

    ranked = get_recommendations(user_summary, event_dicts)
    top = ranked[:5]
    model_text = await generate_recommendation_text(user_summary, top)

    return AIRecommendResponse(
        recommendations=[
            EventRecommendation(
                id=UUID(r["id"]),
                title=r["title"],
                category=r["category"],
                difficulty=r["difficulty"],
                location_name=r.get("location_name"),
                start_date=r["start_date"],
                match_score=r.get("match_score", 0.0),
                description=r.get("description"),
            )
            for r in top
        ],
        profile_summary=user_summary,
        model_text=model_text,
    )


@router.post("/ai/chat", response_model=AIChatPanelResponse, status_code=status.HTTP_200_OK)
async def ai_panel_chat(
    payload: AIChatPanelRequest,
    db: DbSessionDep,
    current_user: OptionalUserDep,
) -> AIChatPanelResponse:
    system_context = await build_user_context(current_user, db)
    history = [{"role": h.role, "content": h.content} for h in payload.history]
    reply = await generate_full_chat_response(
        user_message=payload.message,
        mode=payload.mode,
        history=history,
        system_context=system_context,
    )
    return AIChatPanelResponse(reply=reply)
