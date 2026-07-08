from backend.app.api.routes.ai import generate_code
from backend.app.schemas.ai import AIGenerateRequest


def test_ai_generate_response_schema():
    response = generate_code(AIGenerateRequest(question="Điểm Toán theo vùng?"))
    data = response.model_dump()

    assert data["status"] == "pending_approval"
    assert isinstance(data["explanation"], str)
    assert isinstance(data["code"], str)
    assert data["expected_output"] == "table"
    assert isinstance(data["warnings"], list)
