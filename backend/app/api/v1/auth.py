# filepath: backend/app/api/v1/auth.py
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.base import get_db
from app.models.user import User
from app.schemas.user import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserUpdate,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.email import send_reset_password_email


router = APIRouter(tags=["auth"])

settings = get_settings()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    email = user_in.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalar_one_or_none()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered",
        )

    user = User(
        email=email,
        password_hash=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        phone=user_in.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": str(user.id)},
        expires_delta=access_token_expires,
    )
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    email = credentials.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": str(user.id)},
        expires_delta=access_token_expires,
    )
    return TokenResponse(access_token=access_token)


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
    email = request.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "If the email exists, a reset link has been generated."}
    
    # Create reset token valid for 15 minutes
    token = create_access_token(
        data={"user_id": str(user.id), "type": "reset"},
        expires_delta=timedelta(minutes=15)
    )
    
    # Send real email
    try:
        await send_reset_password_email(email, token)
        return {"message": "E-posta gönderildi. Lütfen gelen kutunuzu kontrol edin."}
    except Exception as e:
        print(f"ERROR: Failed to send email: {e}")
        # Fallback for development if SMTP fails
        return {
            "message": "E-posta gönderilirken bir hata oluştu.",
            "debug_token": token,
            "error": str(e)
        }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(request.token)
        user_id = payload.get("user_id")
        token_type = payload.get("type")
        
        if not user_id or token_type != "reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token"
            )
            
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        user.password_hash = hash_password(request.new_password)
        db.add(user)
        await db.commit()
        
        return {"message": "Password updated successfully"}
        
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
