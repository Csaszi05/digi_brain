from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.inbox import Ticket, TicketMessage, TicketActivity
from app.schemas.inbox import (
    TicketResponse,
    TicketUpdate,
    TicketMessageResponse,
    TicketMessageCreate,
    TicketActivityResponse,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=list[TicketResponse])
async def list_tickets(
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    unread: bool | None = Query(default=None),
    topic_id: str | None = Query(default=None),
    account_id: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    q = select(Ticket).where(Ticket.user_id == user_id, Ticket.deleted_at.is_(None))
    if status:
        q = q.where(Ticket.status == status)
    if priority:
        q = q.where(Ticket.priority == priority)
    if unread is not None:
        q = q.where(Ticket.unread == unread)
    if topic_id:
        q = q.where(Ticket.topic_id == topic_id)
    if account_id:
        q = q.where(Ticket.account_id == account_id)
    q = q.order_by(Ticket.last_message_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    ticket = await _get_owned_ticket(db, ticket_id, user_id)
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    ticket = await _get_owned_ticket(db, ticket_id, user_id)
    changes = payload.model_dump(exclude_none=True)
    for k, v in changes.items():
        setattr(ticket, k, v)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=204)
async def delete_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    ticket = await _get_owned_ticket(db, ticket_id, user_id)
    ticket.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ─── Messages ─────────────────────────────────────────────

@router.get("/{ticket_id}/messages", response_model=list[TicketMessageResponse])
async def list_messages(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    await _get_owned_ticket(db, ticket_id, user_id)
    q = select(TicketMessage).where(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.sent_at)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/{ticket_id}/messages", response_model=TicketMessageResponse, status_code=201)
async def send_reply(
    ticket_id: str,
    payload: TicketMessageCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    await _get_owned_ticket(db, ticket_id, user_id)
    msg = TicketMessage(
        ticket_id=ticket_id,
        direction="out",
        body_text=payload.body_text,
        body_html=payload.body_html,
        to_emails=payload.to_emails,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(msg)

    # Log activity
    activity = TicketActivity(
        ticket_id=ticket_id,
        kind="replied",
        actor="user",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(msg)
    return msg


# ─── Activity ─────────────────────────────────────────────

@router.get("/{ticket_id}/activity", response_model=list[TicketActivityResponse])
async def list_activity(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    await _get_owned_ticket(db, ticket_id, user_id)
    q = select(TicketActivity).where(TicketActivity.ticket_id == ticket_id).order_by(TicketActivity.at)
    result = await db.execute(q)
    return result.scalars().all()


# ─── Helpers ──────────────────────────────────────────────

async def _get_owned_ticket(db: AsyncSession, ticket_id: str, user_id: str) -> Ticket:
    result = await db.execute(
        select(Ticket).where(Ticket.id == ticket_id, Ticket.user_id == user_id, Ticket.deleted_at.is_(None))
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
