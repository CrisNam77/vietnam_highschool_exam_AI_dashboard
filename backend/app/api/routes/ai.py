from fastapi import APIRouter

from backend.app.schemas.ai import AIGenerateRequest, AIGenerateResponse


router = APIRouter()


@router.post("/generate", response_model=AIGenerateResponse)
def generate_code(request: AIGenerateRequest) -> AIGenerateResponse:
    """Return a mocked AI code suggestion for manual approval."""
    safe_demo_code = (
        "summary = df.groupby('vung_mien')['toan'].mean().reset_index()\n"
        "summary = summary.sort_values('toan', ascending=False)\n"
        "summary"
    )

    return AIGenerateResponse(
        status="pending_approval",
        explanation=(
            "Đây là phản hồi giả lập. Code minh họa nhóm dữ liệu theo vùng miền "
            "và tính điểm trung bình môn Toán bằng Pandas."
        ),
        code=safe_demo_code,
        expected_output="table",
        warnings=[],
    )
