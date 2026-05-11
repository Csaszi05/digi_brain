"""
IMAP email sync service.

For each active EmailAccount, connects via IMAPS (TLS port 993),
fetches unseen messages, and upserts them as Tickets + TicketMessages.
Thread detection uses the Message-ID / In-Reply-To headers.
"""

import email
import email.policy
import logging
import re
import uuid
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.message import Message
from typing import Optional

from imapclient import IMAPClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crypto import decrypt
from app.models.inbox import EmailAccount, Ticket, TicketMessage, TicketActivity

log = logging.getLogger(__name__)


# ─── Public entry point ──────────────────────────────────────

async def sync_account(account: EmailAccount, db: AsyncSession) -> int:
    """Sync one email account. Returns the number of new messages processed."""
    if not account.oauth_token_encrypted:
        log.warning("Account %s has no stored credential — skipping", account.email)
        return 0

    try:
        password = decrypt(account.oauth_token_encrypted)
    except ValueError:
        log.error("Cannot decrypt credential for account %s", account.email)
        return 0

    host = account.imap_host or "imap.gmail.com"
    port = account.imap_port or 993

    try:
        with IMAPClient(host, port=port, ssl=True, timeout=15) as client:
            client.login(account.email, password)
            client.select_folder("INBOX", readonly=False)

            last_uid = int((account.sync_state or {}).get("last_uid", 0))
            uid_range = f"{last_uid + 1}:*" if last_uid else "1:*"

            # Fetch only UNSEEN messages in the range we haven't processed yet
            uids = client.search(["UID", uid_range, "UNSEEN"])
            if not uids:
                return 0

            fetch_data = client.fetch(uids, ["RFC822", "FLAGS"])
            processed = 0

            for uid, data in fetch_data.items():
                raw = data.get(b"RFC822")
                if not raw:
                    continue
                msg = email.message_from_bytes(raw, policy=email.policy.default)
                await _upsert_message(account, int(uid), msg, db)
                processed += 1

            # Persist the highest UID we've seen
            new_last_uid = max(int(u) for u in uids)
            account.sync_state = {**(account.sync_state or {}), "last_uid": new_last_uid}
            await db.commit()

            log.info("Account %s: %d new message(s)", account.email, processed)
            return processed

    except Exception as exc:
        log.error("IMAP sync failed for %s: %s", account.email, exc)
        return 0


# ─── Internal helpers ─────────────────────────────────────────

def _decode_header_str(value: Optional[str]) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value or ""


def _extract_body(msg: Message) -> tuple[str, str]:
    """Return (body_text, body_html) from a parsed email."""
    body_text = ""
    body_html = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain" and not body_text:
                body_text = part.get_content() or ""
            elif ct == "text/html" and not body_html:
                body_html = part.get_content() or ""
    else:
        ct = msg.get_content_type()
        content = msg.get_content() or ""
        if ct == "text/html":
            body_html = content
        else:
            body_text = content
    return body_text, body_html


def _parse_address(raw: str) -> tuple[str, str]:
    """Return (display_name, email_address) from a header like 'Anna <anna@x.io>'."""
    m = re.match(r"^(.*?)\s*<([^>]+)>$", raw.strip())
    if m:
        return m.group(1).strip().strip('"'), m.group(2).strip()
    return "", raw.strip()


def _thread_id(msg: Message) -> str:
    """Derive a thread identifier from Message-ID / In-Reply-To."""
    in_reply_to = msg.get("In-Reply-To", "").strip()
    references = msg.get("References", "").strip()
    message_id = msg.get("Message-ID", "").strip()
    # Use the oldest message-id in the thread as the thread anchor
    if references:
        return references.split()[0]
    if in_reply_to:
        return in_reply_to
    return message_id or str(uuid.uuid4())


async def _upsert_message(
    account: EmailAccount,
    uid: int,
    msg: Message,
    db: AsyncSession,
) -> None:
    thread_id = _thread_id(msg)
    subject = _decode_header_str(msg.get("Subject", "(no subject)"))
    from_raw = _decode_header_str(msg.get("From", ""))
    from_name, from_email = _parse_address(from_raw)
    external_id = msg.get("Message-ID", "").strip()

    # Parse date
    date_str = msg.get("Date", "")
    try:
        sent_at = email.utils.parsedate_to_datetime(date_str)
    except Exception:
        sent_at = datetime.now(timezone.utc)

    body_text, body_html = _extract_body(msg)

    # Find or create the parent Ticket for this thread
    existing_ticket = (
        await db.execute(
            select(Ticket).where(
                Ticket.account_id == account.id,
                Ticket.thread_id == thread_id,
            )
        )
    ).scalar_one_or_none()

    if existing_ticket:
        # New message in an existing thread — add TicketMessage, update timestamp
        existing_ticket.last_message_at = sent_at
        existing_ticket.unread = True
        ticket = existing_ticket
    else:
        ticket = Ticket(
            user_id=account.user_id,
            account_id=account.id,
            thread_id=thread_id,
            subject=subject,
            from_name=from_name,
            from_email=from_email,
            status="open",
            priority="med",
            unread=True,
            last_message_at=sent_at,
        )
        db.add(ticket)
        await db.flush()  # get ticket.id

    # Deduplicate: skip if we already stored this exact external_id
    if external_id:
        already = (
            await db.execute(
                select(TicketMessage).where(TicketMessage.external_id == external_id)
            )
        ).scalar_one_or_none()
        if already:
            return

    tm = TicketMessage(
        ticket_id=ticket.id,
        direction="in",
        from_name=from_name,
        from_email=from_email,
        body_text=body_text,
        body_html=body_html,
        sent_at=sent_at,
        external_id=external_id,
    )
    db.add(tm)

    activity = TicketActivity(
        ticket_id=ticket.id,
        kind="received",
        actor=from_email,
        payload={"uid": uid, "subject": subject},
    )
    db.add(activity)
