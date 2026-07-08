from fastapi import APIRouter

from backend.app.core.config import settings
from backend.app.schemas.ai import AIGenerateRequest, AIGenerateResponse
from backend.app.services.ai_service import generate_code_and_explanation
from backend.app.services.log_service import log_interaction


router = APIRouter()


@router.post("/generate", response_model=AIGenerateResponse)
def generate_code(request: AIGenerateRequest) -> AIGenerateResponse:
    """Generate Python code, then wait for user approval before execution."""
    code, explanation = generate_code_and_explanation(request.text)
    log_interaction(
        prompt=request.text,
        generated_code=code,
        explanation=explanation,
        executed_code="",
        status="pending_review" if code else "ai_response",
        output="",
        event_type="generate",
        model=settings.openrouter_model,
    )

    return AIGenerateResponse(
        status="pending_approval",
        explanation=explanation,
        code=code,
        expected_output="table",
        warnings=[],
    )
