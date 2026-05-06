from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.kanban_column import KanbanColumn
from app.models.topic import Topic
from app.schemas.kanban_column import (
    KanbanColumnCreate,
    KanbanColumnResponse,
    KanbanColumnUpdate,
)

router = APIRouter(tags=["kanban_columns"])


async def _ensure_topic_owned(db: AsyncSession, topic_id: str, user_id: str) -> Topic:
    topic = await db.get(Topic, topic_id)
    if topic is None or topic.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found"
        )
    return topic


async def _load_owned_column(db: AsyncSession, column_id: str, user_id: str) -> KanbanColumn:
    column = await db.get(KanbanColumn, column_id)
    if column is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Column not found"
        )
    topic = await db.get(Topic, column.topic_id)
    if topic is None or topic.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Column not found"
        )
    return column


@router.post(
    "/topics/{topic_id}/columns",
    response_model=KanbanColumnResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_column(
    topic_id: str,
    payload: KanbanColumnCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_topic_owned(db, topic_id, user_id)

    pos_stmt = select(func.coalesce(func.max(KanbanColumn.position), -1) + 1).where(
        KanbanColumn.topic_id == topic_id
    )
    next_position = (await db.execute(pos_stmt)).scalar() or 0

    column = KanbanColumn(
        topic_id=topic_id,
        name=payload.name,
        color=payload.color,
        position=next_position,
        is_done_column=payload.is_done_column,
    )
    db.add(column)
    await db.commit()
    await db.refresh(column)
    return column


@router.patch("/columns/{column_id}", response_model=KanbanColumnResponse)
async def update_column(
    column_id: str,
    payload: KanbanColumnUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    column = await _load_owned_column(db, column_id, user_id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(column, key, value)
    await db.commit()
    await db.refresh(column)
    return column


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_column(
    column_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Hard delete — cascades to tasks in this column."""
    column = await _load_owned_column(db, column_id, user_id)
    await db.delete(column)
    await db.commit()
