"""SQLite connection helpers will be implemented later."""

from pathlib import Path

from backend.app.core.config import settings


def get_db_path() -> Path:
    """Return the configured SQLite database path."""
    return Path(settings.sqlite_db_path)
