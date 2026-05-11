from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class TicketStatus(str, Enum):
    open = "open"
    waiting = "waiting"
    done = "done"
    snoozed = "snoozed"


class TicketPriority(str, Enum):
    high = "high"
    med = "med"
    low = "low"


# ─── EmailAccount ─────────────────────────────────────────

class EmailAccountCreate(BaseModel):
    provider: str = Field(..., max_length=20)
    email: str = Field(..., max_length=255)
    display_name: str | None = Field(default=None, max_length=255)
    imap_host: str | None = Field(default=None, max_length=255)
    imap_port: int | None = None


class EmailAccountResponse(BaseModel):
    id: str
    user_id: str
    provider: str
    email: str
    display_name: str | None = None
    imap_host: str | None = None
    imap_port: int | None = None
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── TicketMessage ────────────────────────────────────────

class TicketMessageResponse(BaseModel):
    id: str
    ticket_id: str
    direction: str
    from_name: str | None = None
    from_email: str | None = None
    to_emails: list[str] | None = None
    body_text: str | None = None
    body_html: str | None = None
    sent_at: datetime
    external_id: str | None = None

    model_config = {"from_attributes": True}


class TicketMessageCreate(BaseModel):
    body_text: str | None = None
    body_html: str | None = None
    to_emails: list[str] | None = None


# ─── Ticket ───────────────────────────────────────────────

class TicketResponse(BaseModel):
    id: str
    user_id: str
    account_id: str
    topic_id: str | None = None
    linked_task_id: str | None = None
    thread_id: str
    subject: str
    from_name: str | None = None
    from_email: str
    status: str
    priority: str
    ai_summary: str | None = None
    ai_intent: str | None = None
    due_at: datetime | None = None
    snoozed_until: datetime | None = None
    unread: bool
    last_message_at: datetime
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


class TicketUpdate(BaseModel):
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    topic_id: str | None = None
    linked_task_id: str | None = None
    due_at: datetime | None = None
    snoozed_until: datetime | None = None
    unread: bool | None = None


# ─── InboxRule ────────────────────────────────────────────

class InboxRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    conditions: dict[str, Any]
    actions: list[Any]
    position: int = 0
    active: bool = True


class InboxRuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    conditions: dict[str, Any] | None = None
    actions: list[Any] | None = None
    position: int | None = None
    active: bool | None = None


class InboxRuleResponse(BaseModel):
    id: str
    user_id: str
    name: str
    conditions: dict[str, Any]
    actions: list[Any]
    position: int
    active: bool
    run_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── TicketActivity ───────────────────────────────────────

class TicketActivityResponse(BaseModel):
    id: str
    ticket_id: str
    kind: str
    actor: str | None = None
    payload: dict[str, Any] | None = None
    at: datetime

    model_config = {"from_attributes": True}
