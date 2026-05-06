from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.deps import DEV_USER_ID
from app.api.v1 import columns as columns_router
from app.api.v1 import notes as notes_router
from app.api.v1 import task_links as task_links_router
from app.api.v1 import tasks as tasks_router
from app.api.v1 import topics as topics_router
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User


async def ensure_dev_user() -> None:
    async with AsyncSessionLocal() as db:
        existing = (
            await db.execute(select(User).where(User.id == DEV_USER_ID))
        ).scalar_one_or_none()
        if existing is not None:
            return
        db.add(
            User(
                id=DEV_USER_ID,
                email="dev@digibrain.local",
                password_hash=hash_password("dev"),
            )
        )
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT != "production":
        await ensure_dev_user()
    yield


app = FastAPI(
    title="DigiBrain API",
    version="0.1.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


app.include_router(topics_router.router, prefix="/api/v1")
app.include_router(tasks_router.router, prefix="/api/v1")
app.include_router(columns_router.router, prefix="/api/v1")
app.include_router(task_links_router.router, prefix="/api/v1")
app.include_router(notes_router.router, prefix="/api/v1")
