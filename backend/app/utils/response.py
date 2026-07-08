"""Shared response helpers."""


def ok_response(data: dict | list | None = None) -> dict:
    """Return a consistent success response envelope."""
    return {"status": "ok", "data": data}
