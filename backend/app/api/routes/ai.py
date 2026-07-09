from fastapi import APIRouter

from backend.app.core.config import settings
from backend.app.schemas.ai import AIGenerateRequest, AIGenerateResponse
from backend.app.services.ai_service import generate_code_and_explanation


router = APIRouter()


@router.post("/generate", response_model=AIGenerateResponse)
def generate_code(request: AIGenerateRequest) -> AIGenerateResponse:
    """Generate Python code, then wait for user approval before execution."""
    history = [message.model_dump() for message in request.history]
    code, explanation = generate_code_and_explanation(request.text, history)

    return AIGenerateResponse(
        status="pending_approval",
        explanation=explanation,
        code=code,
        expected_output="table",
        warnings=[],
    )
