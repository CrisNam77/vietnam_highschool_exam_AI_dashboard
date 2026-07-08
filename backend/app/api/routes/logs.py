from pydantic import BaseModel

from fastapi import APIRouter

from backend.app.services.log_service import load_logs, log_interaction


router = APIRouter()


class LogEventRequest(BaseModel):
    prompt: str
    generated_code: str = ""
    explanation: str = ""
    executed_code: str = ""
    status: str
    output: str = ""
    event_type: str


@router.get("")
def list_logs() -> list[dict]:
    return load_logs()


@router.post("/event")
def create_log_event(request: LogEventRequest) -> dict[str, bool]:
    ok = log_interaction(
        prompt=request.prompt,
        generated_code=request.generated_code,
        explanation=request.explanation,
        executed_code=request.executed_code,
        status=request.status,
        output=request.output,
        event_type=request.event_type,
    )
    return {"success": ok}
