import pandas as pd
import pytest
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


def test_execution_handles_syntax_error(monkeypatch):
    monkeypatch.setattr(execution, "_get_dataframe", lambda: pd.DataFrame({"toan": [8.0]}))
    monkeypatch.setattr(execution, "log_interaction", lambda **kwargs: True)
    
    response = run_code(ExecutionRequest(code="print('missing quote)", approved=True))
    data = response.model_dump()
    
    assert data["status"] == "error"
    assert data["success"] is False
    assert any("SyntaxError" in log for log in data["logs"])


def test_execution_handles_runtime_error(monkeypatch):
    monkeypatch.setattr(execution, "_get_dataframe", lambda: pd.DataFrame({"toan": [8.0]}))
    monkeypatch.setattr(execution, "log_interaction", lambda **kwargs: True)
    
    response = run_code(ExecutionRequest(code="print(df['khong_co_cot_nay'])", approved=True))
    data = response.model_dump()
    
    assert data["status"] == "error"
    assert data["success"] is False
    assert any("KeyError" in log for log in data["logs"])


def test_execution_generates_plot_b64(monkeypatch):
    monkeypatch.setattr(execution, "_get_dataframe", lambda: pd.DataFrame({"toan": [8.0, 7.0]}))
    monkeypatch.setattr(execution, "generate_analysis_from_data", lambda _prompt, _stdout: "Plot analysis")
    monkeypatch.setattr(execution, "log_interaction", lambda **kwargs: True)
    
    code = "import matplotlib.pyplot as plt\nplt.plot(df['toan'])\nplt.show()"
    response = run_code(ExecutionRequest(code=code, approved=True, prompt="Ve bieu do"))
    data = response.model_dump()
    
    assert data["status"] == "success"
    assert data["success"] is True
    assert data["plot_b64"] is not None
    assert data["plot_b64"].startswith("iVBORw0KGgo") # Base64 PNG signature usually starts with this
