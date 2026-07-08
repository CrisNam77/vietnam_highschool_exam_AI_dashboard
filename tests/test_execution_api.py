from backend.app.api.routes.execution import run_code
from backend.app.schemas.execution import ExecutionRequest


def test_execution_rejects_unapproved_code():
    response = run_code(ExecutionRequest(code="summary = df.head()", approved=False))
    data = response.model_dump()

    assert data["status"] == "rejected"
    assert data["output"] is None
