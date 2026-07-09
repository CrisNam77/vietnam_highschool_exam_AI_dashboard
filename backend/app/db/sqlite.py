"""SQLite helpers for the Prisma-managed local database."""

from pathlib import Path

from backend.app.core.config import settings


def get_db_path() -> Path:
    """Return the configured SQLite database path.

    The schema is managed by Prisma in frontend/prisma/schema.prisma.
    """
    return Path(settings.sqlite_db_path)
