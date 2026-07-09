from pydantic import BaseModel, Field


class ExecutionRequest(BaseModel):
    code: str = Field(..., min_length=1)
    approved: bool = False
    prompt: str = ""
    explanation: str = ""


class ExecutionResponse(BaseModel):
    status: str
    message: str
    output: dict | list | str | None = None
    logs: list[str] = []
    success: bool | None = None
    stdout: str | None = None
    stderr: str | None = None
    analysis: str | None = None
    plot_b64: str | None = None
