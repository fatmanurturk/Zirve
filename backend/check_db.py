import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.security import verify_password
async def check():
    engine = create_async_engine("postgresql+asyncpg://zirve:zirve123@localhost:5433/zirve_db")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(text("SELECT email, password_hash, is_active FROM users"))
        users = result.fetchall()
        print(f"Total users: {len(users)}")
        for u in users:
            print(f"Email: {u.email}, Active: {u.is_active}")
            print(f"Hash: {u.password_hash}")
            # Try a common password 'password123'
            test_pw = "password123"
            print(f"Does 'password123' match? {verify_password(test_pw, u.password_hash)}")
            print("---")

asyncio.run(check())
