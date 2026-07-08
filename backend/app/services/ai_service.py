import json
import re
import urllib.error
import urllib.request

from backend.app.core.config import settings


SYSTEM_INSTRUCTION = """
Bạn là một trợ lý AI chuyên nghiệp về phân tích dữ liệu điểm thi tốt nghiệp THPT tại Việt Nam từ năm 2022 đến 2025.
Nhiệm vụ của bạn là nhận yêu cầu phân tích của người dùng, đề xuất ý tưởng và viết mã Python để xử lý dữ liệu hoặc vẽ biểu đồ.

Dữ liệu đầu vào là DataFrame `df`. Phải dùng chính xác tên cột kỹ thuật sau:
- Thông tin: `nam`, `chuong_trinh`, `sbd`, `ma_tinh`, `ten_tinh`, `vung_mien`, `vung_3`, `ma_ngoai_ngu`, `so_mon`, `ban`.
- Điểm môn: `toan`, `ngu_van`, `ngoai_ngu`, `vat_li`, `hoa_hoc`, `sinh_hoc`, `lich_su`, `dia_li`, `gdcd`, `tin_hoc`, `cong_nghe_cn`, `cong_nghe_nn`, `gd_ktpl`.
- Điểm khối: `diem_khoi_a00`, `diem_khoi_a01`, `diem_khoi_b00`, `diem_khoi_c00`, `diem_khoi_d01`.

QUY TẮC BẮT BUỘC:
1. Chỉ viết code chạy trên DataFrame `df`; không đọc file, không tải dữ liệu online.
2. Code Python phải nằm trong block ```python ... ```.
3. Comment từng bước bằng tiếng Việt.
4. Biểu đồ phải có tiêu đề, nhãn trục, legend nếu cần, và gọi `plt.tight_layout()`. Không gọi `plt.show()`.
5. Dùng `print()` để in kết quả và nhận xét chính.
6. Nội dung giải thích dùng Markdown rõ ràng, không dùng HTML.
7. Tuyệt đối không dùng tên cột hiển thị tiếng Việt như `Toán`, `Ngữ văn`, `Ngoại ngữ`; phải dùng `toan`, `ngu_van`, `ngoai_ngu`.
"""


def generate_code_and_explanation(prompt: str) -> tuple[str, str]:
    if not settings.openrouter_api_key:
        return (
            "",
            "Không tìm thấy OpenRouter API Key. Vui lòng cấu hình `OPENROUTER_API_KEY` trong file `.env` ở thư mục gốc.",
        )

    try:
        text = _call_openrouter(
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=8192,
        )
        code_match = re.search(r"```python(.*?)```", text, re.DOTALL)
        if not code_match:
            return "", text

        code = code_match.group(1).strip()
        explanation = text.replace(code_match.group(0), "").strip()
        return code, explanation
    except Exception as exc:
        return "", _format_openrouter_error(exc)


def generate_analysis_from_data(prompt: str, stdout: str) -> str:
    if not settings.openrouter_api_key or not stdout.strip():
        return ""

    try:
        return _call_openrouter(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Bạn là chuyên gia phân tích dữ liệu giáo dục. "
                        "Chỉ dựa trên stdout được cung cấp để viết nhận xét Markdown ngắn gọn, "
                        "không bịa số liệu."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Câu hỏi gốc: {prompt}\n\nKết quả dữ liệu:\n{stdout}\n\nHãy viết phân tích:",
                },
            ],
            temperature=0.3,
            max_tokens=4096,
        )
    except Exception:
        return ""


def _call_openrouter(messages: list[dict[str, str]], temperature: float, max_tokens: int) -> str:
    payload = {
        "model": settings.openrouter_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        settings.openrouter_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Vietnam Highschool Exam AI Dashboard",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenRouter HTTP {exc.code}: {detail}") from exc

    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("OpenRouter trả về response không hợp lệ.") from exc


def _format_openrouter_error(error: Exception) -> str:
    raw_error = str(error)

    if "429" in raw_error or "rate limit" in raw_error.lower() or "quota" in raw_error.lower():
        retry_match = re.search(r"retryDelay['\"]?:\s*['\"]?(\d+)s", raw_error)
        if not retry_match:
            retry_match = re.search(r"Please retry in\s+(\d+(?:\.\d+)?)s", raw_error)
        retry_after = f" Bạn có thể thử lại sau khoảng {retry_match.group(1)} giây." if retry_match else ""
        return "OpenRouter API đang bị giới hạn tốc độ hoặc hết quota." + retry_after
    if "401" in raw_error or "403" in raw_error or "unauthorized" in raw_error.lower():
        return "OpenRouter API key không hợp lệ hoặc không có quyền dùng model hiện tại."

    return "Không thể kết nối với OpenRouter API. Vui lòng kiểm tra API key, mạng, credit hoặc trạng thái model."
