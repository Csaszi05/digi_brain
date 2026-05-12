from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.core.crypto import encrypt, decrypt
from app.core.database import get_db
from app.models.calendar import CalendarAccount, Calendar, CalendarEvent
from app.models.time_entry import TimeEntry
from app.schemas.calendar import (
    CalendarAccountCreate, CalendarAccountResponse,
    CalendarResponse, CalendarUpdate,
    CalendarEventCreate, CalendarEventUpdate,
    CalendarEventResponse, LogAsTimeEntryRequest,
)
from app.services.caldav_sync import sync_account, push_event, delete_event_remote

router = APIRouter(prefix="/calendar", tags=["calendar"])


# ─── Calendar accounts ────────────────────────────────────

@router.get("/accounts", response_model=list[CalendarAccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(
        select(CalendarAccount).where(CalendarAccount.user_id == user_id).order_by(CalendarAccount.created_at)
    )
    return result.scalars().all()


@router.post("/accounts", response_model=CalendarAccountResponse, status_code=201)
async def add_account(
    payload: CalendarAccountCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = CalendarAccount(
        user_id=user_id,
        provider=payload.provider,
        display_name=payload.display_name,
        caldav_url=payload.caldav_url,
        username=payload.username,
        password_encrypted=encrypt(payload.password),
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.post("/accounts/{account_id}/test", response_model=dict)
async def test_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = await _get_owned_account(db, account_id, user_id)
    try:
        import caldav
        password = decrypt(account.password_encrypted)
        client = caldav.DAVClient(url=account.caldav_url, username=account.username, password=password)
        principal = client.principal()
        cals = principal.calendars()
        return {"ok": True, "message": f"Kapcsolat sikeres — {len(cals)} naptár található"}
    except Exception as exc:
        return {"ok": False, "message": str(exc)}


@router.post("/accounts/{account_id}/sync", response_model=dict)
async def trigger_sync(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = await _get_owned_account(db, account_id, user_id)
    count = await sync_account(account, db)
    return {"synced": count}


@router.delete("/accounts/{account_id}", status_code=204)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = await _get_owned_account(db, account_id, user_id)
    await db.delete(account)
    await db.commit()


# ─── Calendars ────────────────────────────────────────────

@router.get("/calendars", response_model=list[CalendarResponse])
async def list_calendars(
    account_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    q = select(Calendar).where(Calendar.user_id == user_id)
    if account_id:
        q = q.where(Calendar.account_id == account_id)
    result = await db.execute(q.order_by(Calendar.name))
    return result.scalars().all()


@router.patch("/calendars/{calendar_id}", response_model=CalendarResponse)
async def update_calendar(
    calendar_id: str,
    payload: CalendarUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    cal = await _get_owned_calendar(db, calendar_id, user_id)
    if payload.topic_id is not None:
        cal.topic_id = payload.topic_id or None
    if payload.active is not None:
        cal.active = payload.active
    if payload.color is not None:
        cal.color = payload.color
    await db.commit()
    await db.refresh(cal)
    return cal


# ─── Events ───────────────────────────────────────────────

@router.get("/events", response_model=list[CalendarEventResponse])
async def list_events(
    since: str | None = Query(default=None),
    until: str | None = Query(default=None),
    topic_id: str | None = Query(default=None),
    calendar_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    q = select(CalendarEvent).where(
        CalendarEvent.user_id == user_id,
        CalendarEvent.status != "cancelled",
    )
    if since:
        q = q.where(CalendarEvent.starts_at >= datetime.fromisoformat(since))
    if until:
        q = q.where(CalendarEvent.starts_at <= datetime.fromisoformat(until))
    if topic_id:
        q = q.where(CalendarEvent.topic_id == topic_id)
    if calendar_id:
        q = q.where(CalendarEvent.calendar_id == calendar_id)
    q = q.order_by(CalendarEvent.starts_at)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/events", response_model=CalendarEventResponse, status_code=201)
async def create_event(
    payload: CalendarEventCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    cal = await _get_owned_calendar(db, payload.calendar_id, user_id)

    event = CalendarEvent(
        calendar_id=payload.calendar_id,
        user_id=user_id,
        external_uid=f"{__import__('uuid').uuid4()}@digibrain",
        title=payload.title,
        description=payload.description,
        location=payload.location,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        all_day=payload.all_day,
        topic_id=payload.topic_id or cal.topic_id,
        status="confirmed",
        updated_at=datetime.now(timezone.utc),
    )
    db.add(event)
    await db.flush()

    # Push to CalDAV server
    acc_result = await db.execute(
        select(CalendarAccount).where(CalendarAccount.id == cal.account_id)
    )
    acc = acc_result.scalar_one_or_none()
    if acc:
        await push_event(acc, event, cal.external_id)

    await db.commit()
    await db.refresh(event)
    return event


@router.patch("/events/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: str,
    payload: CalendarEventUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    event = await _get_owned_event(db, event_id, user_id)
    changes = payload.model_dump(exclude_none=True)
    for k, v in changes.items():
        setattr(event, k, v)
    event.updated_at = datetime.now(timezone.utc)

    cal_result = await db.execute(select(Calendar).where(Calendar.id == event.calendar_id))
    cal = cal_result.scalar_one_or_none()
    if cal:
        acc_result = await db.execute(select(CalendarAccount).where(CalendarAccount.id == cal.account_id))
        acc = acc_result.scalar_one_or_none()
        if acc:
            await push_event(acc, event, cal.external_id)

    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    event = await _get_owned_event(db, event_id, user_id)

    cal_result = await db.execute(select(Calendar).where(Calendar.id == event.calendar_id))
    cal = cal_result.scalar_one_or_none()
    if cal:
        acc_result = await db.execute(select(CalendarAccount).where(CalendarAccount.id == cal.account_id))
        acc = acc_result.scalar_one_or_none()
        if acc:
            await delete_event_remote(acc, event, cal.external_id)

    await db.delete(event)
    await db.commit()


@router.post("/events/{event_id}/log-time", response_model=CalendarEventResponse)
async def log_as_time_entry(
    event_id: str,
    payload: LogAsTimeEntryRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    event = await _get_owned_event(db, event_id, user_id)
    if event.time_entry_id:
        raise HTTPException(status_code=400, detail="Already logged as time entry")

    entry = TimeEntry(
        user_id=user_id,
        topic_id=event.topic_id,
        started_at=event.starts_at,
        ended_at=event.ends_at,
        note=payload.note or event.title,
    )
    db.add(entry)
    await db.flush()
    event.time_entry_id = entry.id
    await db.commit()
    await db.refresh(event)
    return event


# ─── Helpers ──────────────────────────────────────────────

async def _get_owned_account(db: AsyncSession, account_id: str, user_id: str) -> CalendarAccount:
    result = await db.execute(
        select(CalendarAccount).where(CalendarAccount.id == account_id, CalendarAccount.user_id == user_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Account not found")
    return obj


async def _get_owned_calendar(db: AsyncSession, calendar_id: str, user_id: str) -> Calendar:
    result = await db.execute(
        select(Calendar).where(Calendar.id == calendar_id, Calendar.user_id == user_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Calendar not found")
    return obj


async def _get_owned_event(db: AsyncSession, event_id: str, user_id: str) -> CalendarEvent:
    result = await db.execute(
        select(CalendarEvent).where(CalendarEvent.id == event_id, CalendarEvent.user_id == user_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Event not found")
    return obj
