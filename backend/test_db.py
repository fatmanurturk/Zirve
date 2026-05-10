import asyncio
from sqlalchemy import select, func
from app.db.base import AsyncSessionLocal
from app.models.event import Event
from app.models.application import Application
from app.models.user import User

async def run():
    async with AsyncSessionLocal() as db:
        query = (
            select(Application, User.full_name, User.avatar_url)
            .join(User, Application.volunteer_id == User.id)
            .limit(1)
        )
        try:
            result = await db.execute(query)
            rows = result.all()
            print("Rows fetched:", len(rows))
            for app, name, avatar in rows:
                print(f"App: {app.id}, name: {name}, avatar: {avatar}")
                # Try to create response
                from app.schemas.application import ApplicationResponse
                from app.api.v1.applications import _app_to_response
                resp = _app_to_response(app)
                resp.volunteer_name = name
                resp.volunteer_avatar_url = avatar
                print("Success")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(run())
