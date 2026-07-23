from fastapi import APIRouter

from backend.app.core.config import settings
from backend.app.schemas.ai import AIGenerateRequest, AIGenerateResponse
from backend.app.services.ai_service import generate_code_and_explanation
from backend.app.utils.code_validator import validate_generated_code


router = APIRouter()


@router.post("/generate", response_model=AIGenerateResponse)
def generate_code(request: AIGenerateRequest) -> AIGenerateResponse:
    """Generate Python code, then wait for user approval before execution."""
    history = [message.model_dump() for message in request.history]
    generated = generate_code_and_explanation(request.text, history)
    code = generated["code"]
    warnings = list(generated["warnings"])
    if code:
        _, validation_warnings = validate_generated_code(code)
        warnings.extend(validation_warnings)

    return AIGenerateResponse(
        status="pending_approval",
        answer_type=generated["answer_type"],
        explanation=generated["explanation"],
        code=code,
        expected_output=generated["expected_output"],
        warnings=warnings,
    )
