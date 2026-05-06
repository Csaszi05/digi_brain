from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.task import Task
from app.models.task_link import LinkType, TaskLink
from app.models.topic import Topic
from app.schemas.task_link import TaskLinkCreate, TaskLinkResponse

router = APIRouter(tags=["task_links"])


async def _ensure_task_owned(db: AsyncSession, task_id: str, user_id: str) -> Task:
    task = await db.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return task


async def _ensure_topic_owned(db: AsyncSession, topic_id: str, user_id: str) -> Topic:
    topic = await db.get(Topic, topic_id)
    if topic is None or topic.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found"
        )
    return topic


async def _has_blocks_path(db: AsyncSession, src: str, dst: str) -> bool:
    """BFS along outgoing 'blocks' edges from src to see if dst is reachable."""
    visited: set[str] = {src}
    queue = [src]
    while queue:
        current = queue.pop(0)
        if current == dst:
            return True
        rows = (
            await db.execute(
                select(TaskLink.target_id).where(
                    TaskLink.source_id == current,
                    TaskLink.link_type == LinkType.blocks.value,
                )
            )
        ).scalars().all()
        for nxt in rows:
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)
    return False


@router.get("/topics/{topic_id}/links", response_model=list[TaskLinkResponse])
async def list_topic_links(
    topic_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Returns every link where source OR target lives in this topic."""
    await _ensure_topic_owned(db, topic_id, user_id)
    stmt = (
        select(TaskLink)
        .join(Task, or_(Task.id == TaskLink.source_id, Task.id == TaskLink.target_id))
        .where(Task.topic_id == topic_id)
        .distinct()
    )
    result = await db.execute(stmt)
    return list(result.scalars().unique())


@router.get("/tasks/{task_id}/links", response_model=list[TaskLinkResponse])
async def list_task_links(
    task_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """All links where this task is either source or target."""
    await _ensure_task_owned(db, task_id, user_id)
    stmt = select(TaskLink).where(
        or_(TaskLink.source_id == task_id, TaskLink.target_id == task_id)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/tasks/{task_id}/links",
    response_model=TaskLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_task_link(
    task_id: str,
    payload: TaskLinkCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    source = await _ensure_task_owned(db, task_id, user_id)
    target = await _ensure_task_owned(db, payload.target_id, user_id)

    if source.id == target.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A task cannot link to itself",
        )

    # Cycle prevention for blocks type — if target already (transitively)
    # blocks source, adding source→target would close a cycle.
    if payload.link_type == LinkType.blocks:
        if await _has_blocks_path(db, target.id, source.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This would create a blocking cycle",
            )

    # Duplicate guard — friendly 409 instead of generic IntegrityError.
    existing = (
        await db.execute(
            select(TaskLink).where(
                TaskLink.source_id == source.id,
                TaskLink.target_id == target.id,
                TaskLink.link_type == payload.link_type.value,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Link already exists"
        )

    link = TaskLink(
        source_id=source.id,
        target_id=target.id,
        link_type=payload.link_type.value,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_link(
    link_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    link = await db.get(TaskLink, link_id)
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Link not found"
        )
    # Authorize through the source task's user
    source = await db.get(Task, link.source_id)
    if source is None or source.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Link not found"
        )
    await db.delete(link)
    await db.commit()
