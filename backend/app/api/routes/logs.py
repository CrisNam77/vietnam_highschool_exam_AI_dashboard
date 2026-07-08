from fastapi import APIRouter, HTTPException

from backend.app.schemas.logs import LogItem


router = APIRouter()


SAMPLE_LOGS: list[LogItem] = []


@router.get("", response_model=list[LogItem])
def list_logs() -> list[LogItem]:
    return SAMPLE_LOGS


@router.get("/{log_id}", response_model=LogItem)
def get_log(log_id: str) -> LogItem:
    for item in SAMPLE_LOGS:
        if item.log_id == log_id:
            return item
    raise HTTPException(status_code=404, detail="Log not found")
