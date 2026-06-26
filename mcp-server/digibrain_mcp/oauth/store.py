"""Tiny SQLite store for OAuth state.

Holds dynamically-registered clients, short-lived pending authorizations,
authorization codes, and access/refresh tokens. One file, no external deps.
Values are JSON blobs; callers reconstruct the SDK models from them.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from typing import Any

_DB_PATH = os.environ.get("MCP_OAUTH_DB", "oauth.db")
_lock = threading.Lock()
_conn: sqlite3.Connection | None = None


def _db() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
        _conn.execute("CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, data TEXT)")
        _conn.execute("CREATE TABLE IF NOT EXISTS pending (id TEXT PRIMARY KEY, data TEXT)")
        _conn.execute("CREATE TABLE IF NOT EXISTS codes (id TEXT PRIMARY KEY, data TEXT)")
        _conn.execute("CREATE TABLE IF NOT EXISTS access (id TEXT PRIMARY KEY, data TEXT)")
        _conn.execute("CREATE TABLE IF NOT EXISTS refresh (id TEXT PRIMARY KEY, data TEXT)")
        _conn.commit()
    return _conn


def _put(table: str, key: str, value: dict[str, Any]) -> None:
    with _lock:
        _db().execute(
            f"INSERT OR REPLACE INTO {table} (id, data) VALUES (?, ?)",
            (key, json.dumps(value)),
        )
        _db().commit()


def _get(table: str, key: str) -> dict[str, Any] | None:
    with _lock:
        row = _db().execute(f"SELECT data FROM {table} WHERE id = ?", (key,)).fetchone()
    return json.loads(row[0]) if row else None


def _delete(table: str, key: str) -> None:
    with _lock:
        _db().execute(f"DELETE FROM {table} WHERE id = ?", (key,))
        _db().commit()


# Thin named wrappers (clarity at call sites).
def put_client(cid: str, data: dict) -> None: _put("clients", cid, data)
def get_client(cid: str) -> dict | None: return _get("clients", cid)

def put_pending(pid: str, data: dict) -> None: _put("pending", pid, data)
def get_pending(pid: str) -> dict | None: return _get("pending", pid)
def del_pending(pid: str) -> None: _delete("pending", pid)

def put_code(code: str, data: dict) -> None: _put("codes", code, data)
def get_code(code: str) -> dict | None: return _get("codes", code)
def del_code(code: str) -> None: _delete("codes", code)

def put_access(tok: str, data: dict) -> None: _put("access", tok, data)
def get_access(tok: str) -> dict | None: return _get("access", tok)
def del_access(tok: str) -> None: _delete("access", tok)

def put_refresh(tok: str, data: dict) -> None: _put("refresh", tok, data)
def get_refresh(tok: str) -> dict | None: return _get("refresh", tok)
def del_refresh(tok: str) -> None: _delete("refresh", tok)
