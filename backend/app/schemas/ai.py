from pydantic import BaseModel, Field


class AIGenerateRequest(BaseModel):
    question: str | None = Field(default=None, min_length=1)
    prompt: str | None = Field(default=None, min_length=1)
    context: dict | None = None

    @property
    def text(self) -> str:
        return self.question or self.prompt or ""


class AIGenerateResponse(BaseModel):
    status: str
    explanation: str
    code: str
    expected_output: str
    warnings: list[str] = []
