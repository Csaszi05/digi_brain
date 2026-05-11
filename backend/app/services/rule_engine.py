"""
InboxRule engine.

Evaluates each active rule (ordered by position) against a newly arrived
Ticket and executes matching actions.  Rules are stored as JSONB:

conditions: {
    "operator": "AND" | "OR",
    "rules": [
        {"field": "from_email", "op": "contains",    "value": "anna@atlas.io"},
        {"field": "subject",    "op": "starts_with", "value": "[GitHub]"}
    ]
}

actions: [
    {"type": "set_status",   "value": "done"},
    {"type": "set_priority", "value": "high"},
    {"type": "set_topic",    "topic_id": "abc-123"},
    {"type": "skip"}          # soft-delete / auto-archive immediately
]

Supported fields:   from_email, from_name, subject, body_text
Supported ops:      contains, not_contains, equals, not_equals,
                    starts_with, ends_with, regex
Supported actions:  set_status, set_priority, set_topic, skip
"""

import logging
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inbox import InboxRule, Ticket, TicketActivity, TicketMessage

log = logging.getLogger(__name__)


# ─── Public entry point ───────────────────────────────────

async def apply_rules(ticket: Ticket, body_text: str, db: AsyncSession) -> None:
    """Run all active rules for the ticket's owner. Mutates ticket in-place."""
    result = await db.execute(
        select(InboxRule)
        .where(InboxRule.user_id == ticket.user_id, InboxRule.active == True)
        .order_by(InboxRule.position)
    )
    rules = result.scalars().all()

    for rule in rules:
        try:
            if _matches(rule.conditions, ticket, body_text):
                await _execute(rule, ticket, db)
                # Increment run counter (fire-and-forget, no flush needed)
                rule.run_count = (rule.run_count or 0) + 1
        except Exception as exc:
            log.warning("Rule %s (%s) error: %s", rule.id, rule.name, exc)


# ─── Condition matching ───────────────────────────────────

def _matches(conditions: dict[str, Any], ticket: Ticket, body_text: str) -> bool:
    operator = (conditions.get("operator") or "AND").upper()
    rules = conditions.get("rules") or []
    if not rules:
        return False

    results = [_eval_condition(r, ticket, body_text) for r in rules]
    return all(results) if operator == "AND" else any(results)


def _field_value(field: str, ticket: Ticket, body_text: str) -> str:
    return {
        "from_email": ticket.from_email or "",
        "from_name":  ticket.from_name  or "",
        "subject":    ticket.subject    or "",
        "body_text":  body_text         or "",
    }.get(field, "")


def _eval_condition(rule: dict[str, Any], ticket: Ticket, body_text: str) -> bool:
    field = rule.get("field", "")
    op    = rule.get("op",    "contains")
    value = rule.get("value", "")
    haystack = _field_value(field, ticket, body_text).lower()
    needle   = value.lower()

    match op:
        case "contains":      return needle in haystack
        case "not_contains":  return needle not in haystack
        case "equals":        return haystack == needle
        case "not_equals":    return haystack != needle
        case "starts_with":   return haystack.startswith(needle)
        case "ends_with":     return haystack.endswith(needle)
        case "regex":
            try:
                return bool(re.search(value, _field_value(field, ticket, body_text), re.I))
            except re.error:
                return False
        case _:
            return False


# ─── Action execution ─────────────────────────────────────

async def _execute(rule: InboxRule, ticket: Ticket, db: AsyncSession) -> None:
    actions = rule.actions or []
    applied = []

    for action in actions:
        atype = action.get("type")

        match atype:
            case "set_status":
                val = action.get("value", "open")
                if val in ("open", "waiting", "done", "snoozed"):
                    ticket.status = val
                    applied.append(f"status → {val}")

            case "set_priority":
                val = action.get("value", "med")
                if val in ("high", "med", "low"):
                    ticket.priority = val
                    applied.append(f"priority → {val}")

            case "set_topic":
                tid = action.get("topic_id")
                if tid:
                    ticket.topic_id = tid
                    applied.append(f"topic → {tid}")

            case "skip":
                ticket.status = "done"
                ticket.unread = False
                applied.append("skip (auto-done)")

            case "archive":
                ticket.status = "archived"
                ticket.unread = False
                applied.append("archived")

    if applied:
        db.add(TicketActivity(
            ticket_id=ticket.id,
            kind="rule_applied",
            actor=f"rule:{rule.id}",
            payload={"rule_name": rule.name, "actions": applied},
        ))
        log.info("Ticket %s: rule '%s' applied: %s", ticket.id, rule.name, applied)
