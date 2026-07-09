import json
import re
import urllib.error
import urllib.request

from backend.app.core.config import settings


MAX_HISTORY_MESSAGES = 10
MAX_HISTORY_CONTENT_CHARS = 1200

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
5. Dùng `print()` để in kết quả theo Markdown gọn gàng, không in trực tiếp DataFrame thô.
6. Khi có bảng, bắt buộc dùng helper có sẵn `print_table(result)`; helper này tự làm tròn, thay giá trị thiếu và in bảng gọn. Nếu bảng quá rộng, chỉ chọn tối đa 6-8 cột quan trọng hoặc tách thành nhiều bảng nhỏ.
7. Với yêu cầu top tỉnh có điểm trung bình cao nhất, ưu tiên dùng helper nhanh `top_province_average(df, 10)` rồi `print_table(result)`; không tạo cột phụ mới trên `df`.
8. Không gán cột mới vào `df` nếu không thật cần thiết. Ưu tiên tạo biến trung gian hoặc DataFrame kết quả nhỏ để tránh chậm và tránh làm bẩn dữ liệu dùng chung.
9. Output phải trả lời trực tiếp câu hỏi bằng số liệu cụ thể, không chỉ mô tả chung. Luôn in các chỉ số chính như số dòng hợp lệ, hệ số/tỷ lệ/trung bình/top N/chênh lệch lớn nhất nếu phù hợp.
10. Nếu câu hỏi so sánh xu hướng theo năm, lưu ý năm 2025 thuộc chương trình 2018 và cấu trúc môn khác 2022-2024; chỉ so sánh trực tiếp khi đã tách hoặc chọn các môn tương thích.
11. Với biểu đồ, tổng hợp dữ liệu trước rồi vẽ bảng nhỏ/top N; không vẽ trực tiếp hàng triệu dòng. Giữ kích thước biểu đồ vừa phải, thường `figsize=(10, 5)` hoặc nhỏ hơn.
12. Output nên có cấu trúc gọn nhưng đủ sâu: tiêu đề cấp 3, bảng Markdown hoặc chỉ số chính, và 3-5 bullet insight có số liệu cụ thể. Không in `[rows x columns]`, không để pandas tự rút gọn bằng `...`.
13. Với tương quan, phải in hệ số tương quan, số cặp dữ liệu hợp lệ, R² xấp xỉ, mức độ quan hệ và insight diễn giải bằng số; nếu có biểu đồ scatter thì nên lấy mẫu tối đa 30.000 điểm để vẽ cho nhanh.
14. Nội dung giải thích dùng Markdown rõ ràng, không dùng HTML.
15. Tuyệt đối không dùng tên cột hiển thị tiếng Việt như `Toán`, `Ngữ văn`, `Ngoại ngữ`; phải dùng `toan`, `ngu_van`, `ngoai_ngu`.
16. Không dùng `sklearn` hoặc thư viện chưa có trong requirements. Với hồi quy/tương quan, dùng `numpy`, `pandas` (`corr`, `polyfit`) để tính hệ số, đường xu hướng và R².
17. Tuyệt đối không trả code chỉ vẽ biểu đồ. Mọi code có biểu đồ phải `print()` trước phần "### Kết quả & insight" với ít nhất: cỡ mẫu, trung bình, trung vị, min/max, nhóm nổi bật và 3-5 bullet insight có số liệu.
18. Với phổ điểm một môn theo năm, bắt buộc lọc theo `nam`, tính `count`, `mean`, `median`, `std`, tỷ lệ `<5`, tỷ lệ `>=8`, khoảng điểm có nhiều thí sinh nhất, rồi mới vẽ histogram.
19. Khi in biến trong chuỗi, bắt buộc dùng f-string hoặc `.format(...)`. Không bao giờ in placeholder thô như `{count}`, `{mean:.2f}`, `{rate_below_5:.2%}`.
20. Phần text ngoài code ở lần trả lời đầu tiên chỉ phân tích câu hỏi/cách tiếp cận, không được giả lập số liệu và không được viết placeholder dạng `{...}`. Insight định lượng cuối cùng chỉ viết sau khi đã có output thật.
"""


def generate_code_and_explanation(prompt: str, history: list[dict] | None = None) -> tuple[str, str]:
    if not settings.openrouter_api_key:
        return (
            "",
            "Không tìm thấy OpenRouter API Key. Vui lòng cấu hình `OPENROUTER_API_KEY` trong file `.env` ở thư mục gốc.",
        )

    try:
        text = _call_openrouter(
            messages=_build_generate_messages(prompt, history or []),
            temperature=0.2,
            max_tokens=8192,
        )
        code_match = re.search(r"```python(.*?)```", text, re.DOTALL)
        if not code_match:
            return "", _sanitize_placeholder_text(text, prompt)

        code = code_match.group(1).strip()
        explanation = text.replace(code_match.group(0), "").strip()
        return code, _sanitize_placeholder_text(explanation, prompt)
    except Exception as exc:
        return "", _format_openrouter_error(exc)


def _build_generate_messages(prompt: str, history: list[dict]) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
    messages.extend(_sanitize_history(history))
    messages.append({"role": "user", "content": prompt})
    return messages


def _has_unresolved_placeholders(text: str) -> bool:
    return bool(re.search(r"\{[a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?(?::[^}]*)?\}", text))


def _sanitize_placeholder_text(text: str, prompt: str) -> str:
    cleaned = text.strip()
    if cleaned and not _has_unresolved_placeholders(cleaned):
        return _normalize_pre_execution_text(cleaned)

    return "\n".join(
        [
            "### Phân tích câu hỏi",
            f"Yêu cầu cần làm rõ: **{prompt.strip()}**.",
            "",
            "- Trọng tâm là phân bố điểm của đúng môn và đúng năm, nên cần lọc dữ liệu hợp lệ trước khi thống kê.",
            "- Các chỉ số nên đọc cùng biểu đồ gồm cỡ mẫu, điểm trung bình, trung vị, độ phân tán và tỷ lệ nhóm điểm thấp/cao.",
            "- Histogram phù hợp để nhìn nhanh vùng điểm tập trung, độ lệch của phổ điểm và các khoảng điểm nổi bật.",
            "- Phần insight cuối nên đối chiếu hình dạng biểu đồ với các chỉ số định lượng thay vì chỉ mô tả biểu đồ.",
        ]
    )


def _normalize_pre_execution_text(text: str) -> str:
    normalized = re.sub(
        r"(?im)^\s*#{1,6}\s*k[ếe]t qu[aả]\s*&\s*insight\s*$",
        "### Phân tích câu hỏi",
        text,
    )
    normalized = re.sub(
        r"(?im)^\s*k[ếe]t qu[aả]\s*&\s*insight\s*$",
        "Phân tích câu hỏi",
        normalized,
    )
    return normalized.strip()


def _sanitize_history(history: list[dict]) -> list[dict[str, str]]:
    clean_messages: list[dict[str, str]] = []

    for item in history[-MAX_HISTORY_MESSAGES:]:
        role = item.get("role")
        if role not in {"user", "assistant"}:
            continue

        content_parts = [str(item.get("content") or "").strip()]
        if role == "assistant" and item.get("output"):
            content_parts.append("Kết quả lần trước:\n" + str(item.get("output") or "").strip())
        if role == "assistant" and item.get("code"):
            content_parts.append("Code lần trước:\n```python\n" + str(item.get("code") or "").strip() + "\n```")

        content = "\n\n".join(part for part in content_parts if part)
        if not content:
            continue

        clean_messages.append(
            {
                "role": role,
                "content": content[:MAX_HISTORY_CONTENT_CHARS],
            }
        )

    return clean_messages


def generate_analysis_from_data(prompt: str, stdout: str) -> str:
    if not settings.openrouter_api_key or not stdout.strip():
        return _fallback_analysis_from_stdout(prompt, stdout)

    try:
        analysis = _call_openrouter(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Bạn là chuyên gia phân tích dữ liệu giáo dục. "
                        "Chỉ dựa trên stdout được cung cấp để viết nhận xét Markdown bằng tiếng Việt, "
                        "không bịa số liệu. Bắt buộc có tiêu đề, 3-5 insight cụ thể có số, "
                        "và một câu kết luận ngắn. Bỏ qua warning/kỹ thuật nếu không ảnh hưởng kết quả."
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
        return analysis.strip() or _fallback_analysis_from_stdout(prompt, stdout)
    except Exception:
        return _fallback_analysis_from_stdout(prompt, stdout)


def _fallback_analysis_from_stdout(prompt: str, stdout: str) -> str:
    if not stdout.strip():
        return ""

    clean_stdout = re.sub(r"(?im)^.*warning.*$", "", stdout)
    numbers = {
        "samples": _find_number(clean_stdout, r"(?:mẫu hợp lệ|số lượng mẫu hợp lệ|n_samples)\D+([\d.,]+)"),
        "corr": _find_number(clean_stdout, r"(?:pearson|tương quan)\D+(-?\d+(?:[.,]\d+)?)"),
        "slope": _find_number(clean_stdout, r"(?:hệ số góc|slope|toán dự đoán văn)\D+(-?\d+(?:[.,]\d+)?)"),
        "intercept": _find_number(clean_stdout, r"(?:hệ số chặn|intercept)\D+(-?\d+(?:[.,]\d+)?)"),
        "r2": _find_number(clean_stdout, r"(?:r\^?2|hệ số xác định)\D+(-?\d+(?:[.,]\d+)?)"),
    }

    title = "### Insight chính"
    if "tương quan" in prompt.lower() or numbers["corr"] is not None:
        corr = numbers["corr"]
        r2 = numbers["r2"]
        samples = numbers["samples"]
        slope = numbers["slope"]
        intercept = numbers["intercept"]
        strength = _correlation_strength(corr)
        lines = [title]
        if samples is not None:
            lines.append(f"- Có **{samples:,.0f}** cặp điểm hợp lệ được dùng để tính tương quan.")
        if corr is not None:
            lines.append(f"- Hệ số Pearson là **{corr:.3f}**, cho thấy quan hệ **{strength}** giữa điểm Toán và Ngữ văn.")
        if r2 is not None:
            lines.append(f"- R² khoảng **{r2:.3f}**, nghĩa là mô hình tuyến tính chỉ giải thích được khoảng **{r2 * 100:.1f}%** biến thiên của điểm Văn.")
        if slope is not None:
            slope_text = f"{slope:.3f}"
            detail = f", với hệ số chặn khoảng **{intercept:.3f}**" if intercept is not None else ""
            lines.append(f"- Theo đường hồi quy, tăng 1 điểm Toán đi kèm thay đổi trung bình khoảng **{slope_text}** điểm Văn{detail}.")
        lines.append("- Kết luận: hai môn có liên hệ cùng chiều nhưng không đủ mạnh để dùng điểm Toán dự đoán chính xác điểm Văn cho từng thí sinh.")
        return "\n".join(lines)

    excerpt = "\n".join(line for line in clean_stdout.splitlines() if line.strip())[:1200]
    return f"{title}\n\n{excerpt}"


def _find_number(text: str, pattern: str) -> float | None:
    match = re.search(pattern, text, flags=re.IGNORECASE)
    if not match:
        return None
    raw = match.group(1)
    if "," in raw and "." in raw:
        raw = raw.replace(",", "")
    elif raw.count(",") > 1:
        raw = raw.replace(",", "")
    elif raw.count(".") > 1:
        raw = raw.replace(".", "")
    else:
        raw = raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def _correlation_strength(value: float | None) -> str:
    if value is None:
        return "chưa xác định"
    abs_value = abs(value)
    direction = "cùng chiều" if value >= 0 else "ngược chiều"
    if abs_value < 0.3:
        level = "yếu"
    elif abs_value < 0.5:
        level = "yếu đến trung bình"
    elif abs_value < 0.7:
        level = "trung bình"
    else:
        level = "mạnh"
    return f"{level}, {direction}"


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
