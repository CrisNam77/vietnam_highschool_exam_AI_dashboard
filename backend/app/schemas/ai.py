from pydantic import BaseModel, Field


class AIGenerateRequest(BaseModel):
    question: str = Field(..., min_length=1)
    context: dict | None = None


class AIGenerateResponse(BaseModel):
    status: str
    explanation: str
    code: str
    expected_output: str
    warnings: list[str] = []
