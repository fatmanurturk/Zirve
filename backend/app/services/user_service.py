from __future__ import annotations

from datetime import timedelta
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole

if TYPE_CHECKING:
    pass

settings = get_settings()


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def register(
        self,
        email: str,
        password: str,
        full_name: str,
        role: UserRole,
        phone: str | None = None,
    ) -> User:
        email = email.lower()
        existing = await self.db.scalar(select(User).where(User.email == email))
        if existing is not None:
            raise ValueError("Bu e-posta adresi zaten kayıtlı.")

        user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role=role,
            phone=phone,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> User:
        email = email.lower()
        user = await self.db.scalar(select(User).where(User.email == email))
        if user is None or not verify_password(password, user.password_hash):
            raise ValueError("E-posta veya şifre hatalı.")
        if not user.is_active:
            raise ValueError("Hesap aktif değil.")
        return user

    def create_token(self, user: User, expires_delta: timedelta | None = None) -> str:
        if expires_delta is None:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return create_access_token(
            data={"user_id": str(user.id)},
            expires_delta=expires_delta,
        )

    def create_reset_token(self, user: User) -> str:
        return create_access_token(
            data={"user_id": str(user.id), "type": "reset"},
            expires_delta=timedelta(minutes=15),
        )

    async def reset_password(self, token: str, new_password: str) -> None:
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
        token_type = payload.get("type")

        if not user_id or token_type != "reset":
            raise ValueError("Geçersiz veya süresi dolmuş token.")

        user = await self.db.scalar(select(User).where(User.id == user_id))
        if user is None:
            raise ValueError("Kullanıcı bulunamadı.")

        user.password_hash = hash_password(new_password)
        self.db.add(user)
        await self.db.commit()

    async def get_by_email(self, email: str) -> User | None:
        return await self.db.scalar(
            select(User).where(User.email == email.lower())
        )
