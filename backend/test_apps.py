import asyncio
from httpx import AsyncClient
from app.main import app
from app.db.base import get_db
from sqlalchemy import select
from app.models.user import User

async def run():
    async with AsyncClient(app=app, base_url='http://test') as client:
        # Get a valid user
        # We need an organizer who has events
        from app.db.base import async_session_maker
        async with async_session_maker() as db:
            result = await db.execute(select(User).limit(1))
            user = result.scalars().first()
            if not user: return
            # Let's bypass login and just call the internal function
