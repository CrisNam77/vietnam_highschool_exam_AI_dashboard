from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.app.core.config import settings
from backend.app.schemas.execution import ExecutionRequest, ExecutionResponse
from backend.app.services.ai_service import generate_analysis_from_data
from backend.app.services.execution_service import execute_code
from backend.app.services.log_service import log_interaction
from backend.app.utils.code_validator import validate_generated_code
from src.viz import load_data


router = APIRouter()
_df_cache = None


def _get_dataframe():
    global _df_cache
    if _df_cache is None:
        data_path = Path(settings.data_path)
        if not data_path.exists():
            raise HTTPException(
                status_code=500,
                detail=f"Không tìm thấy file {data_path}. Vui lòng chuẩn bị dữ liệu processed trước.",
            )
        _df_cache = load_data(data_path)
    return _df_cache


@router.post("/run", response_model=ExecutionResponse)
@router.post("/execute", response_model=ExecutionResponse)
def run_code(request: ExecutionRequest) -> ExecutionResponse:
    """Execute user-approved Python code on the local dataframe."""
    if not request.approved:
        return ExecutionResponse(
            status="rejected",
            message="Code chưa được phê duyệt nên không thực thi.",
            output=None,
            logs=[],
        )

    is_valid, validation_warnings = validate_generated_code(request.code)
    if not is_valid:
        return ExecutionResponse(
            status="rejected",
            message="Code chứa thao tác không được phép nên không thực thi.",
            output=None,
            logs=validation_warnings,
            success=False,
            stdout="",
            stderr="\n".join(validation_warnings),
        )

    result = execute_code(request.code, _get_dataframe())
    analysis = ""
    if result["success"] and result["stdout"].strip():
        analysis = generate_analysis_from_data(request.prompt, result["stdout"])

    status = "success" if result["success"] else "error"
    log_output = result["stdout"] + result["stderr"]
    if analysis:
        log_output = "\n\n---\n\n".join(
            part
            for part in [
                analysis,
                f"### Kết quả chi tiết\n\n{result['stdout']}" if result["stdout"].strip() else "",
                result["stderr"].strip(),
            ]
            if part
        )
    log_interaction(
        prompt=request.prompt,
        generated_code=request.generated_code or request.code,
        explanation=request.explanation,
        executed_code=request.code,
        status=status,
        output=log_output,
        plot_b64=result["plot_b64"],
        event_type="execute",
        model=settings.openrouter_model,
    )

    return ExecutionResponse(
        status=status,
        message="Đã thực thi mã." if result["success"] else "Mã thực thi bị lỗi.",
        output=result["stdout"],
        logs=[result["stderr"]] if result["stderr"] else [],
        success=result["success"],
        stdout=result["stdout"],
        stderr=result["stderr"],
        analysis=analysis,
        plot_b64=result["plot_b64"],
    )
