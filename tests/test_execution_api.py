from backend.app.api.routes.execution import run_code
from backend.app.schemas.execution import ExecutionRequest


def test_execution_rejects_unapproved_code():
    response = run_code(ExecutionRequest(code="summary = df.head()", approved=False, prompt="Xem dữ liệu"))
    data = response.model_dump()

    assert data["status"] == "rejected"
    assert data["output"] is None


def test_execution_rejects_blocked_code_before_loading_data():
    response = run_code(ExecutionRequest(code="open('secret.txt')", approved=True))
    data = response.model_dump()

    assert data["status"] == "rejected"
    assert data["success"] is False
    assert any("open(" in warning for warning in data["logs"])
