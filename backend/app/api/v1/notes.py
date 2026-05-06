from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.note import Note
from app.models.topic import Topic
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter(tags=["notes"])


async def _ensure_topic_owned_or_none(
    db: AsyncSession, topic_id: str | None, user_id: str
) -> None:
    if topic_id is None:
        return
    topic = await db.get(Topic, topic_id)
    if topic is None or topic.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found"
        )


@router.get("/notes", response_model=list[NoteResponse])
async def list_notes(
    topic_id: str | None = Query(None),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List the user's notes. Optional `?topic_id=` filters to one topic."""
    stmt = select(Note).where(Note.user_id == user_id)
    if topic_id is not None:
        stmt = stmt.where(Note.topic_id == topic_id)
    stmt = stmt.order_by(Note.updated_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/topics/{topic_id}/notes", response_model=list[NoteResponse])
async def list_topic_notes(
    topic_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_topic_owned_or_none(db, topic_id, user_id)
    stmt = (
        select(Note)
        .where(Note.user_id == user_id, Note.topic_id == topic_id)
        .order_by(Note.updated_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/notes",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_note(
    payload: NoteCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_topic_owned_or_none(db, payload.topic_id, user_id)
    note = Note(
        user_id=user_id,
        topic_id=payload.topic_id,
        title=payload.title,
        content=payload.content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    note = await db.get(Note, note_id)
    if note is None or note.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.patch("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    payload: NoteUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    note = await db.get(Note, note_id)
    if note is None or note.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    updates = payload.model_dump(exclude_unset=True)
    if "topic_id" in updates:
        await _ensure_topic_owned_or_none(db, updates["topic_id"], user_id)

    for key, value in updates.items():
        setattr(note, key, value)

    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    note = await db.get(Note, note_id)
    if note is None or note.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    await db.delete(note)
    await db.commit()
