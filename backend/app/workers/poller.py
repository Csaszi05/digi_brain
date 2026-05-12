"""
Background polling scheduler — IMAP email + CalDAV calendar.
Uses APScheduler's AsyncIOScheduler so it shares the FastAPI event loop.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.inbox import EmailAccount
from app.models.calendar import CalendarAccount
from app.services.imap_sync import sync_account as imap_sync
from app.services.caldav_sync import sync_account as caldav_sync

log = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _poll_email() -> None:
    log.info("IMAP poll started")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(EmailAccount).where(EmailAccount.active == True))
        accounts = result.scalars().all()
        for account in accounts:
            await imap_sync(account, db)
    log.info("IMAP poll finished (%d account(s))", len(accounts))


async def _poll_calendar() -> None:
    log.info("CalDAV poll started")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(CalendarAccount).where(CalendarAccount.active == True))
        accounts = result.scalars().all()
        for account in accounts:
            await caldav_sync(account, db)
    log.info("CalDAV poll finished (%d account(s))", len(accounts))


def start_scheduler() -> None:
    global _scheduler
    email_interval = settings.IMAP_POLL_INTERVAL_MINUTES
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(_poll_email,    "interval", minutes=email_interval, id="imap_poll",   replace_existing=True)
    _scheduler.add_job(_poll_calendar, "interval", minutes=5,              id="caldav_poll", replace_existing=True)
    _scheduler.start()
    log.info("Pollers started — email: %dmin, calendar: 5min", email_interval)


def stop_scheduler() -> None:
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        log.info("Pollers stopped")
