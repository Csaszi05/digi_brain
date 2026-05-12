"""
CalDAV calendar sync service.

Connects to a CalDAV server, discovers calendars, and syncs events
into the local calendar_events table. Events are linked to topics
via the parent calendar's topic_id.
"""

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import caldav
from caldav.elements import dav
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crypto import decrypt
from app.models.calendar import CalendarAccount, Calendar, CalendarEvent

log = logging.getLogger(__name__)

SYNC_WINDOW_PAST_DAYS   = 30
SYNC_WINDOW_FUTURE_DAYS = 365


# ─── Write operations ─────────────────────────────────────

def _build_ical(event: "CalendarEvent") -> str:
    """Build a minimal iCalendar VEVENT string from a CalendarEvent."""
    from icalendar import Calendar as iCal, Event as iEvent
    cal = iCal()
    cal.add("prodid", "-//DigiBrain//EN")
    cal.add("version", "2.0")
    ev = iEvent()
    ev.add("uid",     event.external_uid)
    ev.add("summary", event.title)
    if event.description:
        ev.add("description", event.description)
    if event.location:
        ev.add("location", event.location)
    if event.all_day:
        from datetime import date
        ev.add("dtstart", event.starts_at.date(), encode=False)
        ev.add("dtend",   event.ends_at.date(),   encode=False)
    else:
        ev.add("dtstart", event.starts_at)
        ev.add("dtend",   event.ends_at)
    ev.add("dtstamp", datetime.now(timezone.utc))
    ev.add("last-modified", datetime.now(timezone.utc))
    cal.add_component(ev)
    return cal.to_ical().decode()


async def push_event(account: "CalendarAccount", event: "CalendarEvent", calendar_external_id: str) -> bool:
    """Create or update a single event on the CalDAV server."""
    try:
        password = decrypt(account.password_encrypted)
        client = caldav.DAVClient(url=account.caldav_url, username=account.username, password=password)
        principal = client.principal()
        remote_cals = principal.calendars()
        target = next((c for c in remote_cals if str(c.url) == calendar_external_id), None)
        if target is None:
            target = remote_cals[0] if remote_cals else None
        if target is None:
            return False
        ical = _build_ical(event)
        target.save_event(ical)
        return True
    except Exception as exc:
        log.error("push_event failed: %s", exc)
        return False


async def delete_event_remote(account: "CalendarAccount", event: "CalendarEvent", calendar_external_id: str) -> bool:
    """Delete an event from the CalDAV server by UID."""
    try:
        password = decrypt(account.password_encrypted)
        client = caldav.DAVClient(url=account.caldav_url, username=account.username, password=password)
        principal = client.principal()
        remote_cals = principal.calendars()
        target = next((c for c in remote_cals if str(c.url) == calendar_external_id), None)
        if target is None:
            return False
        results = target.search(uid=event.external_uid)
        for r in results:
            r.delete()
        return True
    except Exception as exc:
        log.error("delete_event_remote failed: %s", exc)
        return False


# ─── Public entry point ───────────────────────────────────

async def sync_account(account: CalendarAccount, db: AsyncSession) -> int:
    """Sync all active calendars for one account. Returns number of events upserted."""
    try:
        password = decrypt(account.password_encrypted)
    except ValueError:
        log.error("Cannot decrypt credential for calendar account %s", account.id)
        return 0

    try:
        client = caldav.DAVClient(
            url=account.caldav_url,
            username=account.username,
            password=password,
        )
        principal = client.principal()
    except Exception as exc:
        log.error("CalDAV connect failed for %s: %s", account.caldav_url, exc)
        return 0

    total = 0
    try:
        remote_calendars = principal.calendars()
    except Exception as exc:
        log.error("Cannot list calendars for account %s: %s", account.id, exc)
        return 0

    for remote_cal in remote_calendars:
        try:
            total += await _sync_calendar(account, remote_cal, db)
        except Exception as exc:
            log.warning("Calendar sync error (%s): %s", remote_cal.url, exc)

    await db.commit()
    log.info("CalDAV account %s: %d events synced", account.display_name or account.id, total)
    return total


# ─── Calendar discovery & event sync ─────────────────────

async def _sync_calendar(
    account: CalendarAccount,
    remote_cal: caldav.Calendar,
    db: AsyncSession,
) -> int:
    cal_url = str(remote_cal.url)
    cal_name = _cal_name(remote_cal)
    cal_color = _cal_color(remote_cal)

    # Find or create local Calendar row
    local_cal = (await db.execute(
        select(Calendar).where(
            Calendar.account_id == account.id,
            Calendar.external_id == cal_url,
        )
    )).scalar_one_or_none()

    if not local_cal:
        local_cal = Calendar(
            account_id=account.id,
            user_id=account.user_id,
            external_id=cal_url,
            name=cal_name,
            color=cal_color,
        )
        db.add(local_cal)
        await db.flush()
    else:
        local_cal.name  = cal_name
        local_cal.color = cal_color or local_cal.color

    if not local_cal.active:
        return 0

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=SYNC_WINDOW_PAST_DAYS)
    end   = now + timedelta(days=SYNC_WINDOW_FUTURE_DAYS)

    try:
        events = remote_cal.date_search(start=start, end=end, expand=True)
    except Exception as exc:
        log.warning("date_search failed for %s: %s", cal_url, exc)
        return 0

    count = 0
    for event in events:
        try:
            await _upsert_event(local_cal, event, db)
            count += 1
        except Exception as exc:
            log.warning("Event upsert error: %s", exc)

    return count


async def _upsert_event(
    local_cal: Calendar,
    remote_event: caldav.CalendarObjectResource,
    db: AsyncSession,
) -> None:
    vevent = remote_event.vobject_instance.vevent

    uid      = str(vevent.uid.value)
    title    = str(vevent.summary.value) if hasattr(vevent, "summary") else "(no title)"
    desc     = str(vevent.description.value) if hasattr(vevent, "description") else None
    location = str(vevent.location.value) if hasattr(vevent, "location") else None
    status   = str(vevent.status.value).lower() if hasattr(vevent, "status") else "confirmed"

    starts_at, ends_at, all_day = _parse_dates(vevent)
    updated_at = _parse_lastmod(vevent)

    existing = (await db.execute(
        select(CalendarEvent).where(
            CalendarEvent.calendar_id == local_cal.id,
            CalendarEvent.external_uid == uid,
        )
    )).scalar_one_or_none()

    topic_id = local_cal.topic_id

    if existing:
        if existing.updated_at and updated_at and updated_at <= existing.updated_at:
            return  # not changed
        existing.title       = title
        existing.description = desc
        existing.location    = location
        existing.starts_at   = starts_at
        existing.ends_at     = ends_at
        existing.all_day     = all_day
        existing.status      = status
        existing.updated_at  = updated_at
        if not existing.topic_id:
            existing.topic_id = topic_id
    else:
        db.add(CalendarEvent(
            calendar_id  = local_cal.id,
            user_id      = local_cal.user_id,
            external_uid = uid,
            title        = title,
            description  = desc,
            location     = location,
            starts_at    = starts_at,
            ends_at      = ends_at,
            all_day      = all_day,
            status       = status,
            topic_id     = topic_id,
            updated_at   = updated_at,
        ))


# ─── Helpers ─────────────────────────────────────────────

def _cal_name(cal: caldav.Calendar) -> str:
    try:
        return str(cal.get_display_name())
    except Exception:
        return str(cal.url).rstrip("/").split("/")[-1]


def _cal_color(cal: caldav.Calendar) -> Optional[str]:
    try:
        props = cal.get_properties([dav.DisplayName()])
        color = props.get("{http://apple.com/ns/ical/}calendar-color")
        if color:
            return color[:7]  # trim alpha if present (#rrggbbaa → #rrggbb)
    except Exception:
        pass
    return None


def _parse_dates(vevent) -> tuple[datetime, datetime, bool]:
    dtstart = vevent.dtstart.value
    dtend   = getattr(vevent, "dtend", None)

    from datetime import date as date_type
    all_day = isinstance(dtstart, date_type) and not isinstance(dtstart, datetime)

    def to_dt(v) -> datetime:
        if isinstance(v, datetime):
            return v.astimezone(timezone.utc) if v.tzinfo else v.replace(tzinfo=timezone.utc)
        # date → datetime midnight UTC
        return datetime(v.year, v.month, v.day, tzinfo=timezone.utc)

    starts = to_dt(dtstart)
    if dtend:
        ends = to_dt(dtend.value)
    else:
        ends = starts + timedelta(hours=1)

    return starts, ends, all_day


def _parse_lastmod(vevent) -> datetime:
    if hasattr(vevent, "last_modified"):
        v = vevent.last_modified.value
        if isinstance(v, datetime):
            return v.astimezone(timezone.utc) if v.tzinfo else v.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)
