"""CLI entrypoint: export all notes to markdown.

Run inside the backend container:

    python -m app.tools.export_notes

Exits non-zero on failure so the orchestrating cron can stop its chain.
"""

import asyncio
import logging
import sys

from app.core.database import AsyncSessionLocal
from app.services.notes_export import export_all_notes

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("export_notes")


async def _main() -> None:
    async with AsyncSessionLocal() as db:
        await export_all_notes(db)


def main() -> None:
    try:
        asyncio.run(_main())
    except Exception:
        log.exception("Notes export failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
