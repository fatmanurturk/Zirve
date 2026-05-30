# filepath: backend/app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from app.services.email import send_reset_password_email
from app.services.user_service import UserService

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    svc = UserService(db)
    try:
        user = await svc.register(
            email=user_in.email,
            password=user_in.password,
            full_name=user_in.full_name,
            role=user_in.role,
            phone=user_in.phone,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return TokenResponse(access_token=svc.create_token(user))


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    svc = UserService(db)
    try:
        user = await svc.authenticate(credentials.email, credentials.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(access_token=svc.create_token(user))


@router.get("/me", response_model=UserResponse)
async def read_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    user = await svc.get_by_email(request.email)
    if user is None:
        return {"message": "If the email exists, a reset link has been generated."}

    token = svc.create_reset_token(user)
    try:
        await send_reset_password_email(user.email, token)
        return {"message": "E-posta gönderildi. Lütfen gelen kutunuzu kontrol edin."}
    except Exception as e:
        return {
            "message": "E-posta gönderilirken bir hata oluştu.",
            "debug_token": token,
            "error": str(e),
        }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    try:
        await svc.reset_password(request.token, request.new_password)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )
    return {"message": "Password updated successfully"}
