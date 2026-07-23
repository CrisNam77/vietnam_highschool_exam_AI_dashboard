from backend.app.api.routes import ai
from backend.app.api.routes.ai import generate_code
from backend.app.schemas.ai import AIGenerateRequest


def test_ai_generate_response_schema():
    response = generate_code(AIGenerateRequest(question="Điểm Toán theo vùng?"))
    data = response.model_dump()

    assert data["status"] == "pending_approval"
    assert isinstance(data["explanation"], str)
    assert data["answer_type"] in {"text", "code"}
    assert isinstance(data["code"], str)
    assert data["expected_output"] in {"text", "table", "chart", "chart_table"}
    assert isinstance(data["warnings"], list)


def test_ai_generate_includes_validation_warnings(monkeypatch):
    monkeypatch.setattr(
        ai,
        "generate_code_and_explanation",
        lambda _prompt, _history, _attachments=None: {
            "answer_type": "code",
            "explanation": "Test",
            "code": "open('secret.txt')",
            "expected_output": "text",
            "warnings": [],
        },
    )

    response = generate_code(AIGenerateRequest(question="test"))
    data = response.model_dump()

    assert data["answer_type"] == "code"
    assert any("open(" in warning for warning in data["warnings"])


def test_ai_generate_handles_text_only_response(monkeypatch):
    monkeypatch.setattr(
        ai,
        "generate_code_and_explanation",
        lambda _prompt, _history, _attachments=None: {
            "answer_type": "text",
            "explanation": "Đây là câu trả lời text",
            "code": "",
            "expected_output": "text",
            "warnings": [],
        },
    )
    
    response = generate_code(AIGenerateRequest(question="Chào bạn"))
    data = response.model_dump()
    
    assert data["answer_type"] == "text"
    assert data["code"] == ""
    assert data["explanation"] == "Đây là câu trả lời text"


def test_ai_generate_with_history(monkeypatch):
    captured_history = []
    
    def mock_generate(_prompt, history, _attachments=None):
        captured_history.extend(history)
        return {
            "answer_type": "code",
            "explanation": "Test",
            "code": "print('ok')",
            "expected_output": "text",
            "warnings": [],
        }

    monkeypatch.setattr(ai, "generate_code_and_explanation", mock_generate)

    from backend.app.schemas.ai import AIHistoryMessage
    
    response = generate_code(AIGenerateRequest(
        question="Tiếp tục", 
        history=[AIHistoryMessage(role="user", content="Trước đó")]
    ))
    
    assert len(captured_history) == 1
    assert captured_history[0]["content"] == "Trước đó"

