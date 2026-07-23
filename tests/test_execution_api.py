import pandas as pd

from backend.app.api.routes import execution
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


def test_execution_logs_generated_code_separately(monkeypatch):
    captured = {}

    monkeypatch.setattr(execution, "_get_dataframe", lambda: pd.DataFrame({"toan": [8.0]}))
    monkeypatch.setattr(execution, "generate_analysis_from_data", lambda _prompt, _stdout: "")
    monkeypatch.setattr(execution, "log_interaction", lambda **kwargs: captured.update(kwargs) or True)

    response = run_code(
        ExecutionRequest(
            approved=True,
            prompt="Tinh diem",
            generated_code="print('generated')",
            code="print('ran')",
        )
    )

    assert response.status == "success"
    assert captured["generated_code"] == "print('generated')"
    assert captured["executed_code"] == "print('ran')"
