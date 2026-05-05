"""
Common API dependencies.

Auth is intentionally stubbed for early development — `get_current_user_id`
returns a fixed dev user ID. The matching User row is seeded on app startup
(see app.main lifespan). When real JWT auth lands, only this file changes.
"""

DEV_USER_ID = "00000000-0000-0000-0000-000000000001"


async def get_current_user_id() -> str:
    return DEV_USER_ID
