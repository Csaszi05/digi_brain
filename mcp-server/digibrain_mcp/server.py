"""DigiBrain MCP server (stdio).

Exposes the user's DigiBrain data — topics, tasks, notes and time tracking — as
MCP tools so Claude Desktop (or any MCP client) can read and edit it. Read +
create/update only; no destructive deletes in this version.
"""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP

from .client import DigiBrainClient, DigiBrainError
from .config import load_config

mcp = FastMCP("digibrain")

_client: DigiBrainClient | None = None


def _get_client() -> DigiBrainClient:
    global _client
    if _client is None:
        _client = DigiBrainClient(load_config())
    return _client


async def _safe(coro: Any) -> Any:
    """Await a client call, converting backend errors into readable text."""
    try:
        return await coro
    except DigiBrainError as exc:
        return {"error": str(exc)}


# ── topics ──────────────────────────────────────────────────
@mcp.tool()
async def list_topics(include_archived: bool = False) -> Any:
    """List all topics (a flat array; build the tree from each item's parent_id).

    Topics are the top-level organizing unit, like folders/projects. Each has an
    id, name, optional parent_id (for nesting), icon, color and archived flag.
    """
    return await _safe(_get_client().list_topics(include_archived))


@mcp.tool()
async def get_topic(topic_id: str) -> Any:
    """Get one topic including its kanban columns (id, name, is_done_column).

    Use this to discover a topic's column names before creating/moving tasks.
    """
    return await _safe(_get_client().get_topic(topic_id))


@mcp.tool()
async def create_topic(
    name: str,
    parent_id: str | None = None,
    icon: str | None = None,
    color: str | None = None,
) -> Any:
    """Create a topic. Pass parent_id to nest it under another topic. New topics
    get three default kanban columns: To Do, In Progress, Done."""
    return await _safe(
        _get_client().create_topic(
            name=name, parent_id=parent_id, icon=icon, color=color
        )
    )


@mcp.tool()
async def update_topic(
    topic_id: str,
    name: str | None = None,
    parent_id: str | None = None,
    icon: str | None = None,
    color: str | None = None,
    archived: bool | None = None,
) -> Any:
    """Update a topic's fields. Only the arguments you provide are changed.
    Set archived=true to archive (hide) a topic instead of deleting it."""
    return await _safe(
        _get_client().update_topic(
            topic_id,
            name=name,
            parent_id=parent_id,
            icon=icon,
            color=color,
            archived=archived,
        )
    )


# ── tasks ───────────────────────────────────────────────────
@mcp.tool()
async def list_tasks(
    only_open: bool = True,
    due_before: str | None = None,
    order_by: str = "due_date",
    limit: int = 50,
) -> Any:
    """List tasks across all topics (for dashboards / "what's due").

    only_open hides completed tasks. due_before is an ISO date (YYYY-MM-DD).
    order_by is one of: due_date, updated_at, created_at, completed_at.
    """
    return await _safe(
        _get_client().list_tasks(
            only_open=only_open,
            due_before=due_before,
            order_by=order_by,
            limit=limit,
        )
    )


@mcp.tool()
async def list_topic_tasks(topic_id: str, column_name: str | None = None) -> Any:
    """List the tasks inside one topic, optionally filtered to a column by name
    (e.g. 'In Progress')."""
    client = _get_client()
    column_id = None
    if column_name:
        try:
            column_id = await client.resolve_column(topic_id, column_name)
        except DigiBrainError as exc:
            return {"error": str(exc)}
    return await _safe(client.list_topic_tasks(topic_id, column_id))


@mcp.tool()
async def get_task(task_id: str) -> Any:
    """Get one task by id (title, description, priority, due_date, column, etc.)."""
    return await _safe(_get_client().get_task(task_id))


@mcp.tool()
async def create_task(
    topic_id: str,
    title: str,
    column_name: str = "To Do",
    priority: str = "medium",
    description: str | None = None,
    due_date: str | None = None,
    story_points: int | None = None,
    parent_task_id: str | None = None,
) -> Any:
    """Create a task in a topic.

    column_name is resolved to the topic's matching kanban column (default
    'To Do'). priority is low | medium | high. due_date is ISO 8601
    (e.g. 2026-06-20 or 2026-06-20T17:00:00Z). Pass parent_task_id to make
    this a subtask nested under another task (in the same topic).
    """
    client = _get_client()
    try:
        column_id = await client.resolve_column(topic_id, column_name)
    except DigiBrainError as exc:
        return {"error": str(exc)}
    return await _safe(
        client.create_task(
            topic_id,
            title=title,
            column_id=column_id,
            priority=priority,
            description=description,
            due_date=due_date,
            story_points=story_points,
            parent_task_id=parent_task_id,
        )
    )


@mcp.tool()
async def update_task(
    task_id: str,
    title: str | None = None,
    description: str | None = None,
    priority: str | None = None,
    due_date: str | None = None,
    story_points: int | None = None,
    column_name: str | None = None,
    parent_task_id: str | None = None,
) -> Any:
    """Update a task. Only provided fields change. Pass column_name to move the
    task to another column (resolved within the task's own topic); moving it to
    the done column will mark it completed. Pass parent_task_id to nest this task
    under another (make it a subtask)."""
    client = _get_client()
    column_id = None
    if column_name:
        try:
            task = await client.get_task(task_id)
            column_id = await client.resolve_column(task["topic_id"], column_name)
        except DigiBrainError as exc:
            return {"error": str(exc)}
    return await _safe(
        client.update_task(
            task_id,
            title=title,
            description=description,
            priority=priority,
            due_date=due_date,
            story_points=story_points,
            column_id=column_id,
            parent_task_id=parent_task_id,
        )
    )


@mcp.tool()
async def complete_task(task_id: str) -> Any:
    """Mark a task done by moving it to its topic's 'done' column."""
    client = _get_client()
    try:
        task = await client.get_task(task_id)
        column_id = await client.done_column_id(task["topic_id"])
    except DigiBrainError as exc:
        return {"error": str(exc)}
    return await _safe(client.update_task(task_id, column_id=column_id))


# ── notes ───────────────────────────────────────────────────
@mcp.tool()
async def list_notes(topic_id: str | None = None) -> Any:
    """List notes (markdown), newest first. Pass topic_id to filter to one topic."""
    return await _safe(_get_client().list_notes(topic_id))


@mcp.tool()
async def get_note(note_id: str) -> Any:
    """Get one note including its full markdown content."""
    return await _safe(_get_client().get_note(note_id))


@mcp.tool()
async def search_notes(query: str) -> Any:
    """Find notes whose title or content contains the query (case-insensitive)."""
    notes = await _safe(_get_client().list_notes())
    if isinstance(notes, dict):  # error passthrough
        return notes
    q = query.casefold()
    return [
        n
        for n in notes
        if q in (n.get("title") or "").casefold()
        or q in (n.get("content") or "").casefold()
    ]


@mcp.tool()
async def create_note(topic_id: str, title: str, content: str = "") -> Any:
    """Create a markdown note. topic_id may be a topic to file it under (or omit
    by passing an empty string for an unfiled note)."""
    return await _safe(
        _get_client().create_note(
            title=title, content=content, topic_id=topic_id or None
        )
    )


@mcp.tool()
async def update_note(
    note_id: str, title: str | None = None, content: str | None = None
) -> Any:
    """Update a note's title and/or markdown content. Only provided fields change."""
    return await _safe(
        _get_client().update_note(note_id, title=title, content=content)
    )


# ── time ────────────────────────────────────────────────────
@mcp.tool()
async def get_active_timer() -> Any:
    """Return the currently running time entry, or null if no timer is running."""
    return await _safe(_get_client().get_active_timer())


@mcp.tool()
async def start_timer(
    topic_id: str, task_id: str | None = None, note: str | None = None
) -> Any:
    """Start a timer for a topic (and optionally a specific task). Any already
    running timer is stopped automatically."""
    return await _safe(
        _get_client().start_timer(topic_id=topic_id, task_id=task_id, note=note)
    )


@mcp.tool()
async def stop_timer() -> Any:
    """Stop the currently running timer."""
    return await _safe(_get_client().stop_timer())


@mcp.tool()
async def log_time(
    topic_id: str,
    started_at: str,
    ended_at: str,
    task_id: str | None = None,
    note: str | None = None,
) -> Any:
    """Add a manual time entry. started_at and ended_at are ISO 8601 timestamps
    (e.g. 2026-06-14T09:00:00Z); ended_at must be after started_at."""
    return await _safe(
        _get_client().create_time_entry(
            topic_id=topic_id,
            started_at=started_at,
            ended_at=ended_at,
            task_id=task_id,
            note=note,
        )
    )


@mcp.tool()
async def list_time_entries(
    topic_id: str | None = None,
    since: str | None = None,
    until: str | None = None,
    limit: int = 200,
) -> Any:
    """List time entries, newest first. since/until are ISO timestamps filtering
    by start time."""
    return await _safe(
        _get_client().list_time_entries(
            topic_id=topic_id, since=since, until=until, limit=limit
        )
    )


@mcp.tool()
async def time_summary(since: str | None = None, until: str | None = None) -> Any:
    """Summarize tracked hours per topic over a date range (since/until ISO
    timestamps). Returns total hours and a per-topic breakdown."""
    from datetime import datetime

    client = _get_client()
    entries = await _safe(client.list_time_entries(since=since, until=until, limit=1000))
    if isinstance(entries, dict):  # error passthrough
        return entries

    topics = await _safe(client.list_topics(include_archived=True))
    names = (
        {t["id"]: t["name"] for t in topics}
        if isinstance(topics, list)
        else {}
    )

    per_topic: dict[str, float] = {}
    total = 0.0
    for e in entries:
        if not e.get("ended_at"):
            continue  # skip running timer
        start = datetime.fromisoformat(e["started_at"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(e["ended_at"].replace("Z", "+00:00"))
        hours = (end - start).total_seconds() / 3600
        if hours <= 0:
            continue
        per_topic[e["topic_id"]] = per_topic.get(e["topic_id"], 0.0) + hours
        total += hours

    breakdown = [
        {"topic": names.get(tid, tid), "hours": round(h, 2)}
        for tid, h in sorted(per_topic.items(), key=lambda kv: kv[1], reverse=True)
    ]
    return {"total_hours": round(total, 2), "by_topic": breakdown}


# ── kanban columns ──────────────────────────────────────────
@mcp.tool()
async def create_column(
    topic_id: str,
    name: str,
    color: str | None = None,
    is_done_column: bool = False,
) -> Any:
    """Add a kanban column to a topic. It is appended after existing columns.
    Set is_done_column=true if tasks moved here should count as completed."""
    return await _safe(
        _get_client().create_column(
            topic_id, name=name, color=color, is_done_column=is_done_column
        )
    )


@mcp.tool()
async def update_column(
    topic_id: str,
    column_name: str,
    new_name: str | None = None,
    color: str | None = None,
    is_done_column: bool | None = None,
) -> Any:
    """Rename or restyle an existing kanban column. Identify it by its current
    column_name within the topic; only provided fields change."""
    client = _get_client()
    try:
        column_id = await client.resolve_column(topic_id, column_name)
    except DigiBrainError as exc:
        return {"error": str(exc)}
    return await _safe(
        client.update_column(
            column_id, name=new_name, color=color, is_done_column=is_done_column
        )
    )


# ── shopping lists ──────────────────────────────────────────
@mcp.tool()
async def list_shopping_lists() -> Any:
    """List the user's shopping lists (id, name, icon, item_count, checked_count)."""
    return await _safe(_get_client().list_shopping_lists())


@mcp.tool()
async def create_shopping_list(name: str, icon: str | None = None) -> Any:
    """Create a new shopping list (e.g. 'Groceries', 'Hardware store')."""
    return await _safe(_get_client().create_shopping_list(name=name, icon=icon))


@mcp.tool()
async def update_shopping_list(
    list_id: str, name: str | None = None, icon: str | None = None
) -> Any:
    """Rename or re-icon a shopping list. Only provided fields change."""
    return await _safe(_get_client().update_shopping_list(list_id, name=name, icon=icon))


@mcp.tool()
async def delete_shopping_list(list_id: str) -> Any:
    """Delete a shopping list and all its items. This cannot be undone."""
    await _safe(_get_client().delete_shopping_list(list_id))
    return {"deleted": list_id}


@mcp.tool()
async def list_shopping_items(list_name: str | None = None, list_id: str | None = None) -> Any:
    """List items in a shopping list. Identify it by list_name (or list_id, or
    omit both if you only have one list). Each item has name, quantity, category,
    checked."""
    client = _get_client()
    if not list_id:
        try:
            list_id = await client.resolve_shopping_list(list_name)
        except DigiBrainError as exc:
            return {"error": str(exc)}
    return await _safe(client.list_shopping_items(list_id))


@mcp.tool()
async def add_shopping_item(
    name: str,
    list_name: str | None = None,
    list_id: str | None = None,
    quantity: str | None = None,
    note: str | None = None,
    category: str | None = None,
) -> Any:
    """Add an item to a shopping list. Identify the list by list_name (or list_id,
    or omit if only one list). quantity is free text (e.g. '2 kg', '3'). If
    category is omitted the server auto-categorizes by the item name."""
    client = _get_client()
    if not list_id:
        try:
            list_id = await client.resolve_shopping_list(list_name)
        except DigiBrainError as exc:
            return {"error": str(exc)}
    return await _safe(
        client.add_shopping_item(
            list_id, name=name, quantity=quantity, note=note, category=category
        )
    )


@mcp.tool()
async def update_shopping_item(
    item_id: str,
    name: str | None = None,
    quantity: str | None = None,
    note: str | None = None,
    category: str | None = None,
    checked: bool | None = None,
) -> Any:
    """Update a shopping item. Set checked=true to tick it off (bought),
    checked=false to untick. Only provided fields change."""
    return await _safe(
        _get_client().update_shopping_item(
            item_id, name=name, quantity=quantity, note=note, category=category, checked=checked
        )
    )


@mcp.tool()
async def delete_shopping_item(item_id: str) -> Any:
    """Remove a single item from a shopping list."""
    await _safe(_get_client().delete_shopping_item(item_id))
    return {"deleted": item_id}


@mcp.tool()
async def clear_checked_items(list_name: str | None = None, list_id: str | None = None) -> Any:
    """Remove all checked (already-bought) items from a list. Identify by
    list_name, list_id, or omit if only one list."""
    client = _get_client()
    if not list_id:
        try:
            list_id = await client.resolve_shopping_list(list_name)
        except DigiBrainError as exc:
            return {"error": str(exc)}
    return await _safe(client.clear_checked_items(list_id))


@mcp.tool()
async def uncheck_all_items(list_name: str | None = None, list_id: str | None = None) -> Any:
    """Uncheck every item in a list (e.g. to reuse it next week). Identify by
    list_name, list_id, or omit if only one list."""
    client = _get_client()
    if not list_id:
        try:
            list_id = await client.resolve_shopping_list(list_name)
        except DigiBrainError as exc:
            return {"error": str(exc)}
    return await _safe(client.uncheck_all_items(list_id))


# ── calendar ────────────────────────────────────────────────
@mcp.tool()
async def list_calendars() -> Any:
    """List the user's calendars (id, name). Needed to know where to create events."""
    return await _safe(_get_client().list_calendars())


@mcp.tool()
async def list_events(
    since: str | None = None,
    until: str | None = None,
    topic_id: str | None = None,
) -> Any:
    """List calendar events ordered by start time. since/until are ISO timestamps
    filtering by start time; optionally filter by topic_id."""
    return await _safe(
        _get_client().list_events(since=since, until=until, topic_id=topic_id)
    )


@mcp.tool()
async def create_event(
    title: str,
    starts_at: str,
    ends_at: str,
    calendar_name: str | None = None,
    description: str | None = None,
    location: str | None = None,
    all_day: bool = False,
    topic_id: str | None = None,
) -> Any:
    """Create a calendar event (also pushed to the connected CalDAV calendar).

    starts_at/ends_at are ISO 8601 (e.g. 2026-06-20T14:00:00Z). calendar_name
    selects the calendar (omit if you only have one). Optionally link to a topic.
    """
    client = _get_client()
    try:
        calendar_id = await client.resolve_calendar(calendar_name)
    except DigiBrainError as exc:
        return {"error": str(exc)}
    return await _safe(
        client.create_event(
            calendar_id=calendar_id,
            title=title,
            starts_at=starts_at,
            ends_at=ends_at,
            description=description,
            location=location,
            all_day=all_day,
            topic_id=topic_id,
        )
    )


@mcp.tool()
async def update_event(
    event_id: str,
    title: str | None = None,
    starts_at: str | None = None,
    ends_at: str | None = None,
    description: str | None = None,
    location: str | None = None,
    all_day: bool | None = None,
    topic_id: str | None = None,
) -> Any:
    """Update a calendar event. Only provided fields change. Times are ISO 8601."""
    return await _safe(
        _get_client().update_event(
            event_id,
            title=title,
            starts_at=starts_at,
            ends_at=ends_at,
            description=description,
            location=location,
            all_day=all_day,
            topic_id=topic_id,
        )
    )


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
