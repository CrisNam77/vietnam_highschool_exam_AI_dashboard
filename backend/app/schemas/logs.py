from datetime import datetime

from pydantic import BaseModel


class LogItem(BaseModel):
    log_id: str
    created_at: datetime
    question: str | None = None
    status: str
    expected_output: str | None = None
    message: str | None = None
