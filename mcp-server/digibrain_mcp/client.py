"""HTTP client for the DigiBrain backend.

Transport-agnostic: this class knows nothing about MCP. The same client will
back a future remote HTTP MCP server. It handles login, attaches the bearer
token, re-authenticates once on a 401 (tokens last 30 days), and offers a few
convenience resolvers (column name -> id) that make the MCP tools ergonomic.
"""

from __future__ import annotations

from typing import Any

import httpx

from .config import Config


class DigiBrainError(Exception):
    """Raised when the backend returns an error; carries a human message."""


class DigiBrainClient:
    def __init__(self, config: Config) -> None:
        self._config = config
        # 60s: calendar create/update/delete push to an external CalDAV server,
        # which can be slow; a short timeout would error even though the op succeeds.
        self._client = httpx.AsyncClient(base_url=config.api_url, timeout=60.0)
        # Prefer a personal access token (bypasses 2FA); fall back to login.
        self._uses_api_token = bool(config.api_token)
        self._token: str | None = config.api_token or None

    async def aclose(self) -> None:
        await self._client.aclose()

    # ── auth ────────────────────────────────────────────────
    async def _login(self) -> None:
        resp = await self._client.post(
            "/auth/login",
            json={"email": self._config.email, "password": self._config.password},
        )
        if resp.status_code != 200:
            raise DigiBrainError(
                f"Login failed ({resp.status_code}): {_detail(resp)}"
            )
        self._token = resp.json()["access_token"]

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._token}"} if self._token else {}

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        """Send a request. With an API token, use it directly; otherwise log in
        lazily and retry once on 401 (covers JWT expiry)."""
        if self._token is None and not self._uses_api_token:
            await self._login()

        resp = await self._client.request(
            method, path, headers=self._auth_headers(), **kwargs
        )
        if resp.status_code == 401 and not self._uses_api_token:
            # JWT expired/invalid — re-login once and retry.
            await self._login()
            resp = await self._client.request(
                method, path, headers=self._auth_headers(), **kwargs
            )

        if resp.status_code >= 400:
            raise DigiBrainError(
                f"{method} {path} failed ({resp.status_code}): {_detail(resp)}"
            )
        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()

    # ── topics ──────────────────────────────────────────────
    async def list_topics(self, include_archived: bool = False) -> list[dict]:
        return await self._request(
            "GET", "/topics", params={"include_archived": include_archived}
        )

    async def get_topic(self, topic_id: str) -> dict:
        return await self._request("GET", f"/topics/{topic_id}")

    async def create_topic(self, **body: Any) -> dict:
        return await self._request("POST", "/topics", json=_clean(body))

    async def update_topic(self, topic_id: str, **body: Any) -> dict:
        return await self._request("PATCH", f"/topics/{topic_id}", json=_clean(body))

    # ── tasks ───────────────────────────────────────────────
    async def list_tasks(self, **params: Any) -> list[dict]:
        return await self._request("GET", "/tasks", params=_clean(params))

    async def list_topic_tasks(self, topic_id: str, column_id: str | None = None) -> list[dict]:
        params = {"column_id": column_id} if column_id else {}
        return await self._request("GET", f"/topics/{topic_id}/tasks", params=params)

    async def get_task(self, task_id: str) -> dict:
        return await self._request("GET", f"/tasks/{task_id}")

    async def create_task(self, topic_id: str, **body: Any) -> dict:
        return await self._request(
            "POST", f"/topics/{topic_id}/tasks", json=_clean(body)
        )

    async def update_task(self, task_id: str, **body: Any) -> dict:
        return await self._request("PATCH", f"/tasks/{task_id}", json=_clean(body))

    # ── notes ───────────────────────────────────────────────
    async def list_notes(self, topic_id: str | None = None) -> list[dict]:
        params = {"topic_id": topic_id} if topic_id else {}
        return await self._request("GET", "/notes", params=params)

    async def get_note(self, note_id: str) -> dict:
        return await self._request("GET", f"/notes/{note_id}")

    async def create_note(self, **body: Any) -> dict:
        return await self._request("POST", "/notes", json=_clean(body))

    async def update_note(self, note_id: str, **body: Any) -> dict:
        return await self._request("PATCH", f"/notes/{note_id}", json=_clean(body))

    # ── time ────────────────────────────────────────────────
    async def get_active_timer(self) -> dict | None:
        return await self._request("GET", "/time/active")

    async def start_timer(self, **body: Any) -> dict:
        return await self._request("POST", "/time/start", json=_clean(body))

    async def stop_timer(self) -> dict:
        return await self._request("POST", "/time/stop")

    async def create_time_entry(self, **body: Any) -> dict:
        return await self._request("POST", "/time/entries", json=_clean(body))

    async def list_time_entries(self, **params: Any) -> list[dict]:
        return await self._request("GET", "/time/entries", params=_clean(params))

    # ── kanban columns ──────────────────────────────────────
    async def create_column(self, topic_id: str, **body: Any) -> dict:
        return await self._request(
            "POST", f"/topics/{topic_id}/columns", json=_clean(body)
        )

    async def update_column(self, column_id: str, **body: Any) -> dict:
        return await self._request("PATCH", f"/columns/{column_id}", json=_clean(body))

    # ── calendar ────────────────────────────────────────────
    async def list_calendars(self) -> list[dict]:
        return await self._request("GET", "/calendar/calendars")

    async def list_events(self, **params: Any) -> list[dict]:
        return await self._request("GET", "/calendar/events", params=_clean(params))

    async def create_event(self, **body: Any) -> dict:
        return await self._request("POST", "/calendar/events", json=_clean(body))

    async def update_event(self, event_id: str, **body: Any) -> dict:
        return await self._request("PATCH", f"/calendar/events/{event_id}", json=_clean(body))

    async def delete_event(self, event_id: str) -> None:
        return await self._request("DELETE", f"/calendar/events/{event_id}")

    # ── shopping lists ──────────────────────────────────────
    async def list_shopping_lists(self) -> list[dict]:
        return await self._request("GET", "/shopping/lists")

    async def create_shopping_list(self, **body: Any) -> dict:
        return await self._request("POST", "/shopping/lists", json=_clean(body))

    async def update_shopping_list(self, list_id: str, **body: Any) -> dict:
        return await self._request("PATCH", f"/shopping/lists/{list_id}", json=_clean(body))

    async def delete_shopping_list(self, list_id: str) -> None:
        return await self._request("DELETE", f"/shopping/lists/{list_id}")

    async def list_shopping_items(self, list_id: str) -> list[dict]:
        return await self._request("GET", f"/shopping/lists/{list_id}/items")

    async def add_shopping_item(self, list_id: str, **body: Any) -> dict:
        return await self._request(
            "POST", f"/shopping/lists/{list_id}/items", json=_clean(body)
        )

    async def update_shopping_item(self, item_id: str, **body: Any) -> dict:
        return await self._request("PATCH", f"/shopping/items/{item_id}", json=_clean(body))

    async def delete_shopping_item(self, item_id: str) -> None:
        return await self._request("DELETE", f"/shopping/items/{item_id}")

    async def clear_checked_items(self, list_id: str) -> dict:
        return await self._request("POST", f"/shopping/lists/{list_id}/clear-checked")

    async def uncheck_all_items(self, list_id: str) -> dict:
        return await self._request("POST", f"/shopping/lists/{list_id}/uncheck-all")

    # ── convenience resolvers ───────────────────────────────
    async def resolve_column(self, topic_id: str, column_name: str) -> str:
        """Map a human column name (e.g. 'To Do') to its column_id within a topic."""
        topic = await self.get_topic(topic_id)
        columns = topic.get("kanban_columns", [])
        for col in columns:
            if col["name"].casefold() == column_name.casefold():
                return col["id"]
        names = ", ".join(repr(c["name"]) for c in columns) or "(none)"
        raise DigiBrainError(
            f"No column named {column_name!r} in this topic. Available: {names}"
        )

    async def resolve_shopping_list(self, list_name: str | None) -> str:
        """Pick a shopping list by name, or the only one if name is omitted."""
        lists = await self.list_shopping_lists()
        if not lists:
            raise DigiBrainError("No shopping lists yet. Create one first.")
        if list_name:
            for lst in lists:
                if lst["name"].casefold() == list_name.casefold():
                    return lst["id"]
            names = ", ".join(repr(l["name"]) for l in lists)
            raise DigiBrainError(f"No shopping list named {list_name!r}. Available: {names}")
        if len(lists) == 1:
            return lists[0]["id"]
        names = ", ".join(repr(l["name"]) for l in lists)
        raise DigiBrainError(f"Multiple shopping lists — specify one of: {names}")

    async def resolve_calendar(self, calendar_name: str | None) -> str:
        """Pick a calendar by name, or the only one if name is omitted."""
        calendars = await self.list_calendars()
        if not calendars:
            raise DigiBrainError("No calendars found. Connect a calendar account first.")
        if calendar_name:
            for cal in calendars:
                if cal["name"].casefold() == calendar_name.casefold():
                    return cal["id"]
            names = ", ".join(repr(c["name"]) for c in calendars)
            raise DigiBrainError(
                f"No calendar named {calendar_name!r}. Available: {names}"
            )
        if len(calendars) == 1:
            return calendars[0]["id"]
        names = ", ".join(repr(c["name"]) for c in calendars)
        raise DigiBrainError(
            f"Multiple calendars exist — specify one of: {names}"
        )

    async def done_column_id(self, topic_id: str) -> str:
        """Return the id of the topic's 'done' column (is_done_column=True)."""
        topic = await self.get_topic(topic_id)
        for col in topic.get("kanban_columns", []):
            if col.get("is_done_column"):
                return col["id"]
        raise DigiBrainError("This topic has no column marked as done.")


def _detail(resp: httpx.Response) -> str:
    try:
        return str(resp.json().get("detail", resp.text))
    except Exception:
        return resp.text or "(no body)"


def _clean(d: dict[str, Any]) -> dict[str, Any]:
    """Drop keys whose value is None so we send only the fields the caller set."""
    return {k: v for k, v in d.items() if v is not None}
