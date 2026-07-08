from fastapi import APIRouter

from backend.app.schemas.execution import ExecutionRequest, ExecutionResponse


router = APIRouter()


@router.post("/run", response_model=ExecutionResponse)
def run_code(request: ExecutionRequest) -> ExecutionResponse:
    """Skeleton endpoint for future local code execution."""
    if not request.approved:
        return ExecutionResponse(
            status="rejected",
            message="Code chưa được phê duyệt nên không thực thi.",
            output=None,
            logs=[],
        )

    # TODO: execution thật sẽ được triển khai sau với validator và sandbox local.
    return ExecutionResponse(
        status="queued_for_future_implementation",
        message="Execution thật chưa được triển khai trong boilerplate.",
        output=None,
        logs=["TODO: validate code, create sandbox, execute locally, persist log."],
    )
