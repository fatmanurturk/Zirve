from __future__ import annotations

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.applications import router as applications_router
from app.api.v1.auth import router as auth_router
from app.api.v1.badges import router as badges_router
from app.api.v1.events import router as events_router
from app.api.v1.organizations import router as organizations_router
from app.api.v1.volunteers import router as volunteers_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/api/v1/auth")
api_router.include_router(events_router, prefix="/api/v1/events")
api_router.include_router(badges_router, prefix="/api/v1")
api_router.include_router(applications_router, prefix="/api/v1")
api_router.include_router(volunteers_router, prefix="/api/v1")
api_router.include_router(organizations_router, prefix="/api/v1")

app.include_router(api_router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {
        "status": "ok",
        "app": settings.APP_NAME,
    }