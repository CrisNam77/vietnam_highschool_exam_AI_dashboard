from pydantic import BaseModel, Field


class AIHistoryMessage(BaseModel):
    role: str
    content: str = ""
    output: str | None = None
    code: str | None = None


class AIGenerateRequest(BaseModel):
    question: str | None = Field(default=None, min_length=1)
    prompt: str | None = Field(default=None, min_length=1)
    context: dict | None = None
    history: list[AIHistoryMessage] = []

    @property
    def text(self) -> str:
        return self.question or self.prompt or ""


class AIGenerateResponse(BaseModel):
    status: str
    explanation: str
    code: str
    expected_output: str
    warnings: list[str] = []
