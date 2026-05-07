from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.kanban_column import KanbanColumn
from app.models.task import Task
from app.models.topic import Topic
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=list[TaskResponse])
async def list_all_tasks(
    completed_since: date | None = Query(None, description="Only tasks with completed_at >= this date"),
    due_before: date | None = Query(None, description="Only tasks with due_date <= this date"),
    only_open: bool = Query(False, description="Exclude tasks already completed"),
    order_by: str = Query("updated_at", description="updated_at | due_date | completed_at | created_at"),
    limit: int = Query(50, ge=1, le=500),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Cross-topic task list for the current user. Used by dashboard widgets."""
    stmt = select(Task).where(Task.user_id == user_id)
    if completed_since is not None:
        stmt = stmt.where(Task.completed_at >= datetime.combine(completed_since, datetime.min.time(), tzinfo=timezone.utc))
    if due_before is not None:
        stmt = stmt.where(Task.due_date <= datetime.combine(due_before, datetime.max.time(), tzinfo=timezone.utc))
    if only_open:
        stmt = stmt.where(Task.completed_at.is_(None))

    order_col = {
        "updated_at": Task.updated_at,
        "due_date": Task.due_date,
        "completed_at": Task.completed_at,
        "created_at": Task.created_at,
    }.get(order_by, Task.updated_at)

    # Newest-first for time-based fields; for due_date, ascending is more useful
    if order_by == "due_date":
        stmt = stmt.order_by(order_col.asc().nulls_last())
    else:
        stmt = stmt.order_by(order_col.desc().nulls_last())

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def _ensure_topic_owned(db: AsyncSession, topic_id: str, user_id: str) -> Topic:
    topic = await db.get(Topic, topic_id)
    if topic is None or topic.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found"
        )
    return topic


async def _ensure_column_in_topic(
    db: AsyncSession, column_id: str, topic_id: str
) -> KanbanColumn:
    column = await db.get(KanbanColumn, column_id)
    if column is None or column.topic_id != topic_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kanban column not found in this topic",
        )
    return column


@router.get("/topics/{topic_id}/tasks", response_model=list[TaskResponse])
async def list_tasks(
    topic_id: str,
    column_id: str | None = Query(None),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_topic_owned(db, topic_id, user_id)
    stmt = select(Task).where(Task.topic_id == topic_id)
    if column_id is not None:
        stmt = stmt.where(Task.column_id == column_id)
    stmt = stmt.order_by(Task.column_id, Task.position, Task.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/topics/{topic_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    topic_id: str,
    payload: TaskCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_topic_owned(db, topic_id, user_id)
    column = await _ensure_column_in_topic(db, payload.column_id, topic_id)

    pos_stmt = select(func.coalesce(func.max(Task.position), -1) + 1).where(
        Task.topic_id == topic_id, Task.column_id == payload.column_id
    )
    next_position = (await db.execute(pos_stmt)).scalar() or 0

    task = Task(
        topic_id=topic_id,
        user_id=user_id,
        column_id=payload.column_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority.value,
        due_date=payload.due_date,
        position=next_position,
        completed_at=datetime.now(timezone.utc) if column.is_done_column else None,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    updates = payload.model_dump(exclude_unset=True)

    if "column_id" in updates and updates["column_id"] != task.column_id:
        new_column = await _ensure_column_in_topic(db, updates["column_id"], task.topic_id)
        # Auto-toggle completed_at when crossing the "done" boundary
        if new_column.is_done_column and not task.completed_at:
            task.completed_at = datetime.now(timezone.utc)
        elif not new_column.is_done_column and task.completed_at:
            task.completed_at = None

    if "priority" in updates and updates["priority"] is not None:
        updates["priority"] = updates["priority"].value if hasattr(updates["priority"], "value") else updates["priority"]

    for key, value in updates.items():
        setattr(task, key, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    await db.delete(task)
    await db.commit()
