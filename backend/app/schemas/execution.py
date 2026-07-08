from pydantic import BaseModel, Field


class ExecutionRequest(BaseModel):
    code: str = Field(..., min_length=1)
    approved: bool = False


class ExecutionResponse(BaseModel):
    status: str
    message: str
    output: dict | list | str | None = None
    logs: list[str] = []
