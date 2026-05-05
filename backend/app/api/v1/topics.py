from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.topic import Topic
from app.models.kanban_column import KanbanColumn
from app.schemas.topic import (
    TopicCreate,
    TopicResponse,
    TopicUpdate,
    TopicWithColumnsResponse,
)

router = APIRouter(prefix="/topics", tags=["topics"])

DEFAULT_COLUMNS: list[dict] = [
    {"name": "To Do", "position": 0, "is_done_column": False},
    {"name": "In Progress", "position": 1, "is_done_column": False},
    {"name": "Done", "position": 2, "is_done_column": True},
]


async def _load_topic_with_columns(
    db: AsyncSession, topic_id: str, user_id: str
) -> Topic | None:
    stmt = (
        select(Topic)
        .options(selectinload(Topic.kanban_columns))
        .where(Topic.id == topic_id, Topic.user_id == user_id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get("", response_model=list[TopicResponse])
async def list_topics(
    include_archived: bool = Query(False),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Returns the user's topics as a flat list. Client builds the tree from parent_id."""
    stmt = select(Topic).where(Topic.user_id == user_id)
    if not include_archived:
        stmt = stmt.where(Topic.archived.is_(False))
    stmt = stmt.order_by(Topic.position, Topic.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=TopicWithColumnsResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    payload: TopicCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Creates a topic and auto-generates its 3 default kanban columns."""
    if payload.parent_id:
        parent = await db.get(Topic, payload.parent_id)
        if parent is None or parent.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent topic not found",
            )

    # Next sibling position
    pos_stmt = select(func.coalesce(func.max(Topic.position), -1) + 1).where(
        Topic.user_id == user_id,
        Topic.parent_id.is_(None) if payload.parent_id is None else Topic.parent_id == payload.parent_id,
    )
    next_position = (await db.execute(pos_stmt)).scalar() or 0

    topic = Topic(
        user_id=user_id,
        parent_id=payload.parent_id,
        name=payload.name,
        icon=payload.icon,
        color=payload.color,
        position=next_position,
    )
    db.add(topic)
    await db.flush()

    for col_def in DEFAULT_COLUMNS:
        db.add(
            KanbanColumn(
                topic_id=topic.id,
                name=col_def["name"],
                position=col_def["position"],
                is_done_column=col_def["is_done_column"],
            )
        )

    await db.commit()
    fresh = await _load_topic_with_columns(db, topic.id, user_id)
    assert fresh is not None
    return fresh


@router.get("/{topic_id}", response_model=TopicWithColumnsResponse)
async def get_topic(
    topic_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    topic = await _load_topic_with_columns(db, topic_id, user_id)
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
    return topic


@router.patch("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: str,
    payload: TopicUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    topic = (
        await db.execute(
            select(Topic).where(Topic.id == topic_id, Topic.user_id == user_id)
        )
    ).scalar_one_or_none()
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    updates = payload.model_dump(exclude_unset=True)

    if "parent_id" in updates and updates["parent_id"] is not None:
        if updates["parent_id"] == topic_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Topic cannot be its own parent",
            )
        new_parent = await db.get(Topic, updates["parent_id"])
        if new_parent is None or new_parent.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent topic not found",
            )

    for key, value in updates.items():
        setattr(topic, key, value)

    await db.commit()
    await db.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Hard delete — cascades to children, kanban columns, tasks, notes."""
    topic = (
        await db.execute(
            select(Topic).where(Topic.id == topic_id, Topic.user_id == user_id)
        )
    ).scalar_one_or_none()
    if topic is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")

    await db.delete(topic)
    await db.commit()
