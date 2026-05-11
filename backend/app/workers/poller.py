"""
Background IMAP polling scheduler.

Runs sync_account() for every active EmailAccount on a fixed interval.
Uses APScheduler's AsyncIOScheduler so it shares the FastAPI event loop.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.inbox import EmailAccount
from app.services.imap_sync import sync_account

log = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _poll_all() -> None:
    log.info("IMAP poll started")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(EmailAccount).where(EmailAccount.active == True)
        )
        accounts = result.scalars().all()
        for account in accounts:
            await sync_account(account, db)
    log.info("IMAP poll finished (%d account(s))", len(accounts))


def start_scheduler() -> None:
    global _scheduler
    interval = settings.IMAP_POLL_INTERVAL_MINUTES
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(_poll_all, "interval", minutes=interval, id="imap_poll", replace_existing=True)
    _scheduler.start()
    log.info("IMAP poller started — interval: %d min", interval)


def stop_scheduler() -> None:
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        log.info("IMAP poller stopped")
