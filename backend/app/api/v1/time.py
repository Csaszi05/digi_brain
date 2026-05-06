from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.task import Task
from app.models.time_entry import TimeEntry
from app.models.topic import Topic
from app.schemas.time_entry import (
    TimeEntryResponse,
    TimeEntryStart,
    TimeEntryUpdate,
)

router = APIRouter(prefix="/time", tags=["time"])


async def _ensure_topic_owned(db: AsyncSession, topic_id: str, user_id: str) -> Topic:
    topic = await db.get(Topic, topic_id)
    if topic is None or topic.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return topic


async def _ensure_task_owned_in_topic(
    db: AsyncSession, task_id: str | None, topic_id: str, user_id: str
) -> Task | None:
    if task_id is None:
        return None
    task = await db.get(Task, task_id)
    if task is None or task.user_id != user_id or task.topic_id != topic_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found in this topic",
        )
    return task


async def _get_active_entry(db: AsyncSession, user_id: str) -> TimeEntry | None:
    stmt = select(TimeEntry).where(
        TimeEntry.user_id == user_id, TimeEntry.ended_at.is_(None)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get("/active", response_model=TimeEntryResponse | None)
async def get_active_entry(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """The currently running entry for this user, or null if idle."""
    return await _get_active_entry(db, user_id)


@router.post(
    "/start",
    response_model=TimeEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_entry(
    payload: TimeEntryStart,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Start a new time entry. Auto-stops any existing running entry first."""
    await _ensure_topic_owned(db, payload.topic_id, user_id)
    await _ensure_task_owned_in_topic(db, payload.task_id, payload.topic_id, user_id)

    now = datetime.now(timezone.utc)

    existing = await _get_active_entry(db, user_id)
    if existing is not None:
        existing.ended_at = now

    entry = TimeEntry(
        user_id=user_id,
        topic_id=payload.topic_id,
        task_id=payload.task_id,
        started_at=now,
        ended_at=None,
        note=payload.note,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.post("/stop", response_model=TimeEntryResponse)
async def stop_entry(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Stop the user's currently running entry."""
    entry = await _get_active_entry(db, user_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No timer is running"
        )
    entry.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/entries", response_model=list[TimeEntryResponse])
async def list_entries(
    topic_id: str | None = Query(None),
    since: datetime | None = Query(None),
    until: datetime | None = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TimeEntry).where(TimeEntry.user_id == user_id)
    if topic_id is not None:
        stmt = stmt.where(TimeEntry.topic_id == topic_id)
    if since is not None:
        stmt = stmt.where(TimeEntry.started_at >= since)
    if until is not None:
        stmt = stmt.where(TimeEntry.started_at < until)
    stmt = stmt.order_by(TimeEntry.started_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/entries/{entry_id}", response_model=TimeEntryResponse)
async def update_entry(
    entry_id: str,
    payload: TimeEntryUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    entry = await db.get(TimeEntry, entry_id)
    if entry is None or entry.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    updates = payload.model_dump(exclude_unset=True)
    if "topic_id" in updates and updates["topic_id"] is not None:
        await _ensure_topic_owned(db, updates["topic_id"], user_id)
    if "task_id" in updates and updates["task_id"] is not None:
        topic_id = updates.get("topic_id", entry.topic_id)
        await _ensure_task_owned_in_topic(db, updates["task_id"], topic_id, user_id)

    for key, value in updates.items():
        setattr(entry, key, value)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    entry = await db.get(TimeEntry, entry_id)
    if entry is None or entry.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    await db.delete(entry)
    await db.commit()
