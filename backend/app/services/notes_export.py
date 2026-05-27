"""
One-way markdown export: notes (DB) -> .md files on disk.

The app is the source of truth. Every note is written to a `.md` file under
`settings.NOTES_SYNC_PATH`, in a folder structure mirroring the topic hierarchy.
In production that path is bind-mounted to a Nextcloud directory, so the files
sync to the user's devices and are readable in Obsidian. Edits made in Obsidian
do NOT flow back — this is export only.

The export is idempotent: a file is only rewritten when its content actually
changes, and files no longer backed by a note are removed (orphan cleanup).
"""

import logging
import os
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.note import Note
from app.models.topic import Topic

log = logging.getLogger(__name__)

INBOX_FOLDER = "_Inbox"          # notes with no topic land here
MAX_SEGMENT_LEN = 120            # max length of a single folder / filename stem
_ILLEGAL_CHARS = r'/\:*?"<>|'    # path-illegal chars (control chars handled separately)
_ILLEGAL_RE = re.compile(f"[{re.escape(_ILLEGAL_CHARS)}]")
_WHITESPACE_RE = re.compile(r"\s+")


@dataclass
class ExportStats:
    notes_total: int = 0
    written: int = 0       # files newly written or changed
    skipped: int = 0       # files unchanged, left untouched
    deleted: int = 0       # orphan .md files removed
    dirs_removed: int = 0  # empty directories removed


def sanitize_segment(raw: str, *, fallback: str) -> str:
    """Turn an arbitrary string into a safe single path segment.

    Keeps unicode letters (Hungarian text stays intact), strips path-illegal
    and control characters, collapses whitespace, trims trailing dots/spaces,
    and never returns an empty / "." / ".." segment.
    """
    if raw is None:
        return fallback
    s = unicodedata.normalize("NFC", raw)
    s = _ILLEGAL_RE.sub(" ", s)
    s = "".join(c for c in s if not unicodedata.category(c).startswith("C"))
    s = _WHITESPACE_RE.sub(" ", s).strip()
    # Trim trailing dots/spaces (hostile on macOS/Windows; guards against . / ..).
    prev = None
    while s != prev:
        prev = s
        s = s.rstrip(". ").strip()
    if len(s) > MAX_SEGMENT_LEN:
        s = s[:MAX_SEGMENT_LEN].rstrip(". ").strip()
    if s in ("", ".", ".."):
        return fallback
    return s


def build_topic_path(topic_id: str | None, topics: dict[str, Topic]) -> list[str]:
    """Build the folder segments (root -> leaf) for a topic.

    Walks the parent_id chain using an in-memory topic map. Defends against
    cycles and dangling parents. None topic -> the inbox folder.
    """
    if topic_id is None:
        return [INBOX_FOLDER]
    if topic_id not in topics:
        # Note points at a topic that no longer exists — treat as orphaned.
        log.warning("Note references missing topic %s — routing to %s", topic_id, INBOX_FOLDER)
        return [INBOX_FOLDER]

    segments: list[str] = []
    visited: set[str] = set()
    current: str | None = topic_id
    while current is not None:
        if current in visited:
            log.warning("Topic cycle detected at %s — stopping path walk", current)
            break
        visited.add(current)
        topic = topics.get(current)
        if topic is None:
            log.warning("Dangling parent topic %s — stopping path walk", current)
            break
        segments.append(sanitize_segment(topic.name, fallback="_Untitled"))
        current = topic.parent_id
    return list(reversed(segments))


def _yaml_str(value: str) -> str:
    """Escape a string for a double-quoted YAML scalar (frontmatter)."""
    flattened = _WHITESPACE_RE.sub(" ", value).strip()
    escaped = flattened.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def build_note_markdown(note: Note, topic_display: str) -> str:
    """Render a note as markdown with Obsidian-friendly YAML frontmatter."""
    lines = [
        "---",
        f"id: {note.id}",
        f"title: {_yaml_str(note.title)}",
        f"topic: {_yaml_str(topic_display)}",
        f"created: {note.created_at.isoformat() if note.created_at else ''}",
        f"updated: {note.updated_at.isoformat() if note.updated_at else ''}",
        "---",
        "",
        "",
    ]
    content = note.content or ""
    body = "\n".join(lines) + content
    if not body.endswith("\n"):
        body += "\n"
    return body


def compute_relative_path(
    note: Note, topics: dict[str, Topic], claimed: set[str]
) -> tuple[Path, str]:
    """Compute the relative .md path for a note and the human topic display path.

    Disambiguates path collisions (same title + topic) deterministically by
    appending the short note id. `claimed` tracks case-folded path keys taken
    so far in this run.
    """
    segments = build_topic_path(note.topic_id, topics)
    topic_display = "" if note.topic_id is None else "/".join(segments)

    stem = sanitize_segment(note.title, fallback=f"Untitled-{note.id[:8]}")
    rel = Path(*segments) / f"{stem}.md"
    key = str(rel).casefold()
    if key in claimed:
        stem = f"{stem} ({note.id[:8]})"
        rel = Path(*segments) / f"{stem}.md"
        key = str(rel).casefold()
        if key in claimed:  # astronomically unlikely
            stem = f"{stem}-{note.id}"
            rel = Path(*segments) / f"{stem}.md"
            key = str(rel).casefold()
    claimed.add(key)
    return rel, topic_display


def _write_if_changed(target: Path, content: str, stats: ExportStats) -> None:
    """Write content atomically, but only if the file differs (preserve mtime)."""
    new_bytes = content.encode("utf-8")
    if target.exists():
        try:
            if target.read_bytes() == new_bytes:
                stats.skipped += 1
                return
        except OSError:
            pass  # unreadable -> overwrite
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(f".{target.name}.tmp")
    tmp.write_bytes(new_bytes)
    os.replace(tmp, target)
    stats.written += 1


def _cleanup_orphans(root: Path, desired: set[Path], stats: ExportStats) -> None:
    """Remove .md files not in `desired` and any resulting empty directories.

    Strictly confined to `root`. Only ever deletes *.md files — never touches
    other files (e.g. .obsidian/, attachments).
    """
    for md_file in root.rglob("*.md"):
        resolved = md_file.resolve()
        if not resolved.is_relative_to(root):
            continue  # paranoia against symlinks escaping root
        if resolved not in desired:
            try:
                resolved.unlink()
                stats.deleted += 1
            except OSError as exc:
                log.warning("Could not delete orphan %s: %s", resolved, exc)

    # Remove now-empty directories, deepest first. Never remove root itself.
    dirs = sorted(
        (p for p in root.rglob("*") if p.is_dir()),
        key=lambda p: len(p.parts),
        reverse=True,
    )
    for d in dirs:
        if not d.is_relative_to(root) or d == root:
            continue
        try:
            next(d.iterdir())
        except StopIteration:
            try:
                d.rmdir()
                stats.dirs_removed += 1
            except OSError as exc:
                log.warning("Could not remove empty dir %s: %s", d, exc)
        except OSError:
            continue


async def export_all_notes(db: AsyncSession) -> ExportStats:
    """Export every note to a .md file under settings.NOTES_SYNC_PATH.

    Idempotent: unchanged files are left alone, orphaned files are removed.
    """
    stats = ExportStats()
    root = Path(settings.NOTES_SYNC_PATH).resolve()

    # Safety: refuse to operate on a dangerously short root (e.g. "/").
    if len(root.parts) < 2:
        log.error("Refusing to export to unsafe root %s", root)
        return stats

    root.mkdir(parents=True, exist_ok=True)

    topics = {t.id: t for t in (await db.execute(select(Topic))).scalars().all()}
    notes = list((await db.execute(select(Note))).scalars().all())
    stats.notes_total = len(notes)

    # Deterministic order so collision disambiguation is stable across runs.
    notes.sort(key=lambda n: (n.created_at.isoformat() if n.created_at else "", n.id))

    claimed: set[str] = set()
    desired: dict[Path, str] = {}
    for note in notes:
        rel, topic_display = compute_relative_path(note, topics, claimed)
        target = (root / rel).resolve()
        if not target.is_relative_to(root):
            log.error("Computed path escapes root, skipping note %s", note.id)
            continue
        desired[target] = build_note_markdown(note, topic_display)

    for target, content in desired.items():
        _write_if_changed(target, content, stats)

    _cleanup_orphans(root, set(desired.keys()), stats)

    log.info(
        "Notes export: notes=%d written=%d skipped=%d deleted=%d dirs_removed=%d",
        stats.notes_total, stats.written, stats.skipped, stats.deleted, stats.dirs_removed,
    )
    return stats
