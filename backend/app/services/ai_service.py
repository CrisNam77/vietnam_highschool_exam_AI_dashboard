import json
import re
import urllib.error
import urllib.request
from typing import Any

from backend.app.core.config import settings


MAX_HISTORY_MESSAGES = 10
MAX_HISTORY_CONTENT_CHARS = 1200
GENERATE_MAX_TOKENS = 2048
ANALYSIS_MAX_TOKENS = 2048
CODE_BLOCK_PATTERN = re.compile(r"```python(.*?)```", re.DOTALL)
PLACEHOLDER_PATTERN = re.compile(r"\{[a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?(?::[^}]*)?\}")
EXPECTED_OUTPUT_VALUES = {"text", "table", "chart", "chart_table"}
ANSWER_TYPE_VALUES = {"text", "code"}

SYSTEM_INSTRUCTION = """
Bạn là một trợ lý AI chuyên nghiệp về phân tích dữ liệu điểm thi tốt nghiệp THPT tại Việt Nam từ năm 2022 đến 2025.
Nhiệm vụ của bạn là nhận yêu cầu phân tích của người dùng, đề xuất ý tưởng và viết mã Python để xử lý dữ liệu hoặc vẽ biểu đồ khi cần. Nếu câu hỏi không cần chạy dữ liệu hoặc không liên quan đến dữ liệu điểm thi, hãy trả lời Markdown đầy đủ, rõ ràng, không cần ép sinh code.

Dữ liệu đầu vào là DataFrame `df`. Phải dùng chính xác tên cột kỹ thuật sau:
- Thông tin: `nam`, `chuong_trinh`, `sbd`, `ma_tinh`, `ten_tinh`, `vung_mien`, `vung_3`, `ma_ngoai_ngu`, `so_mon`, `ban`.
- Điểm môn: `toan`, `ngu_van`, `ngoai_ngu`, `vat_li`, `hoa_hoc`, `sinh_hoc`, `lich_su`, `dia_li`, `gdcd`, `tin_hoc`, `cong_nghe_cn`, `cong_nghe_nn`, `gd_ktpl`.
- Điểm khối: `diem_khoi_a00`, `diem_khoi_a01`, `diem_khoi_b00`, `diem_khoi_c00`, `diem_khoi_d01`.
- Vùng so sánh 3 miền phải dùng cột `vung_3` với giá trị chính xác `Bắc`, `Trung`, `Nam`. Không lọc `vung_mien == "Miền Bắc"` hoặc `"Miền Nam"` vì `vung_mien` là vùng kinh tế như `Đồng bằng sông Hồng`, `Đông Nam Bộ`.
- Ban/tổ hợp tự nhiên-xã hội dùng cột `ban` với giá trị `KHTN` hoặc `KHXH`, không dùng chuỗi dài `Khoa học tự nhiên`/`Khoa học xã hội`.
- Tên tỉnh/thành trong `ten_tinh` thường ở dạng đầy đủ và viết hoa như `THÀNH PHỐ HÀ NỘI`, `THÀNH PHỐ HỒ CHÍ MINH`, `TỈNH THANH HÓA`; nếu người dùng nói tên ngắn, nên lọc bằng `.str.contains("HÀ NỘI", case=False, na=False)` thay vì so sánh bằng đúng `"Hà Nội"`.

QUY TẮC BẮT BUỘC:
1. Chỉ viết code chạy trên DataFrame `df`; không đọc file, không tải dữ liệu online.
2. Khi cần xử lý dữ liệu bằng Python, code phải nằm trong block ```python ... ```. Nếu câu hỏi chỉ cần giải thích khái niệm/quy trình và không cần truy vấn `df`, có thể trả lời Markdown đầy đủ mà không cần code.
3. Comment từng bước bằng tiếng Việt.
4. Biểu đồ phải có tiêu đề, nhãn trục, legend nếu cần, và gọi `plt.tight_layout()`. Không gọi `plt.show()`.
5. Dùng `print()` để in kết quả theo Markdown gọn gàng, không in trực tiếp DataFrame thô.
6. Khi có bảng, bắt buộc dùng helper có sẵn `print_table(result)`; helper này tự làm tròn, thay giá trị thiếu và in bảng gọn. Nếu bảng quá rộng, chỉ chọn tối đa 6-8 cột quan trọng hoặc tách thành nhiều bảng nhỏ.
7. Với yêu cầu top tỉnh có điểm trung bình cao nhất, ưu tiên dùng helper nhanh `top_province_average(df, 10)` rồi `print_table(result)`; không tạo cột phụ mới trên `df`.
8. Không gán cột mới vào `df` nếu không thật cần thiết. Ưu tiên tạo biến trung gian hoặc DataFrame kết quả nhỏ để tránh chậm và tránh làm bẩn dữ liệu dùng chung.
9. Output phải trả lời trực tiếp câu hỏi bằng số liệu cụ thể, không chỉ mô tả chung. Luôn in các chỉ số chính như số dòng hợp lệ, hệ số/tỷ lệ/trung bình/top N/chênh lệch lớn nhất nếu phù hợp.
10. Nếu câu hỏi so sánh xu hướng theo năm, lưu ý năm 2025 thuộc chương trình 2018 và cấu trúc môn khác 2022-2024; chỉ so sánh trực tiếp khi đã tách hoặc chọn các môn tương thích.
11. Nếu câu hỏi có thể trực quan hóa hợp lý, ưu tiên tạo biểu đồ trước để người dùng nhìn nhanh xu hướng/phân bố/so sánh; sau đó mới in bảng/số liệu chi tiết. Với biểu đồ, tổng hợp dữ liệu trước rồi vẽ bảng nhỏ/top N; không vẽ trực tiếp hàng triệu dòng. Giữ kích thước biểu đồ vừa phải, thường `figsize=(10, 5)` hoặc nhỏ hơn.
12. Output nên có cấu trúc gọn nhưng đủ sâu: tiêu đề cấp 3, bảng Markdown hoặc chỉ số chính, và 3-5 bullet insight có số liệu cụ thể. Không in `[rows x columns]`, không để pandas tự rút gọn bằng `...`.
13. Với tương quan, phải in hệ số tương quan, số cặp dữ liệu hợp lệ, R² xấp xỉ, mức độ quan hệ và insight diễn giải bằng số; nếu có biểu đồ scatter thì nên lấy mẫu tối đa 30.000 điểm để vẽ cho nhanh.
14. Nội dung giải thích dùng Markdown rõ ràng, không dùng HTML.
15. Tuyệt đối không dùng tên cột hiển thị tiếng Việt như `Toán`, `Ngữ văn`, `Ngoại ngữ`; phải dùng `toan`, `ngu_van`, `ngoai_ngu`.
16. Không dùng `sklearn` hoặc thư viện chưa có trong requirements. Với hồi quy/tương quan, dùng `numpy`, `pandas` (`corr`, `polyfit`) để tính hệ số, đường xu hướng và R².
17. Tuyệt đối không trả code chỉ vẽ biểu đồ. Mọi code có biểu đồ phải `print()` trước phần "### Kết quả & insight" với ít nhất: cỡ mẫu, trung bình, trung vị, min/max, nhóm nổi bật và 3-5 bullet insight có số liệu.
18. Với phổ điểm một môn theo năm, bắt buộc lọc theo `nam`, tính `count`, `mean`, `median`, `std`, tỷ lệ `<5`, tỷ lệ `>=8`, khoảng điểm có nhiều thí sinh nhất, rồi mới vẽ histogram.
19. Khi in biến trong chuỗi, bắt buộc dùng f-string hoặc `.format(...)`. Không bao giờ in placeholder thô như `{count}`, `{mean:.2f}`, `{rate_below_5:.2%}`.
20. Phần text ngoài code ở lần trả lời đầu tiên chỉ phân tích câu hỏi/cách tiếp cận, không được giả lập số liệu và không được viết placeholder dạng `{...}`. Insight định lượng cuối cùng chỉ viết sau khi đã có output thật.
21. Với biểu đồ so sánh nhiều nhóm, không vẽ các histogram/bar dạng filled chồng lên nhau bằng `alpha` vì màu sẽ bị trộn và khó đọc. Ưu tiên dùng màu tương phản rõ như `#2563eb`, `#f97316`, `#16a34a`, `#dc2626`; với histogram so sánh phải dùng `histtype="step"`/đường viền, `multiple="dodge"` nếu dùng seaborn, hoặc vẽ các nhóm cạnh nhau. Không để hai màu phủ lên nhau tạo màu nâu/xám bẩn.
22. Cột `sbd` là mã định danh dạng chuỗi. Nếu cần xét SBD chẵn/lẻ, bắt buộc tạo biến số bằng `sbd_num = pd.to_numeric(data["sbd"], errors="coerce")` rồi dùng `sbd_num % 2`; không dùng trực tiếp `data["sbd"] % 2`.
23. Không phải câu hỏi nào cũng cần biểu đồ. Nếu câu hỏi không phù hợp để vẽ biểu đồ, không có dữ liệu định lượng rõ ràng, hoặc người dùng hỏi giải thích/định nghĩa/quy trình, hãy trả lời bằng text Markdown thật đầy đủ, có cấu trúc, ví dụ và lưu ý; không bịa số liệu và không tạo biểu đồ gượng ép.
24. Khi người dùng nói miền Bắc/miền Trung/miền Nam, bắt buộc lọc bằng `vung_3.isin(["Bắc", "Nam"])` hoặc so sánh trực tiếp `df["vung_3"] == "Bắc"`/`"Nam"`. Không dùng chuỗi `Miền Bắc`, `Miền Nam` trong code.
25. Khi người dùng nói ban tự nhiên/xã hội, bắt buộc dùng `df["ban"] == "KHTN"` hoặc `df["ban"] == "KHXH"`.
26. Khi lọc tỉnh/thành theo tên người dùng nhập, ưu tiên `df["ten_tinh"].str.contains("TÊN TỈNH", case=False, na=False)` để tránh sai do tiền tố `TỈNH`/`THÀNH PHỐ` và khác biệt viết hoa.

ĐỊNH DẠNG PHẢN HỒI:
- Ưu tiên trả về đúng một JSON object thuần, không bọc trong Markdown/code fence.
- Schema bắt buộc:
  {
    "answer_type": "code" hoặc "text",
    "explanation": "Markdown ngắn để người dùng đọc trước khi duyệt",
    "code": "Python code nếu answer_type=code, ngược lại để chuỗi rỗng",
    "expected_output": "text" hoặc "table" hoặc "chart" hoặc "chart_table",
    "warnings": ["cảnh báo ngắn nếu có"]
  }
- Nếu answer_type="text", không bịa số liệu định lượng từ data thật.
"""


def generate_code_and_explanation(prompt: str, history: list[dict] | None = None) -> dict[str, Any]:
    if not settings.openrouter_api_key:
        return _generated_payload(
            code="",
            explanation="Không tìm thấy OpenRouter API Key. Vui lòng cấu hình `OPENROUTER_API_KEY` trong file `.env` ở thư mục gốc.",
            answer_type="text",
            expected_output="text",
        )

    try:
        text = _call_openrouter(
            messages=_build_generate_messages(prompt, history or []),
            temperature=0.2,
            max_tokens=GENERATE_MAX_TOKENS,
        )
        parsed = _parse_generated_response(text, prompt)
        code = parsed["code"]
        explanation = parsed["explanation"]
        if not code:
            parsed["answer_type"] = "text"
            parsed["expected_output"] = "text"
        return parsed
    except Exception as exc:
        return _generated_payload(
            code="",
            explanation=_format_openrouter_error(exc),
            answer_type="text",
            expected_output="text",
        )


def _build_generate_messages(prompt: str, history: list[dict]) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
    messages.extend(_sanitize_history(history))
    messages.append({"role": "user", "content": prompt})
    return messages


def _extract_python_code(text: str) -> tuple[str, str]:
    code_match = CODE_BLOCK_PATTERN.search(text)
    if not code_match:
        return "", text.strip()

    code = code_match.group(1).strip()
    explanation = text.replace(code_match.group(0), "").strip()
    return code, explanation


def _generated_payload(
    code: str,
    explanation: str,
    answer_type: str = "code",
    expected_output: str = "table",
    warnings: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "answer_type": answer_type if answer_type in ANSWER_TYPE_VALUES else "code",
        "explanation": explanation,
        "code": code,
        "expected_output": expected_output if expected_output in EXPECTED_OUTPUT_VALUES else "table",
        "warnings": warnings or [],
    }


def _parse_generated_response(text: str, prompt: str) -> dict[str, Any]:
    parsed_json = _parse_json_object(text)
    if parsed_json:
        code = str(parsed_json.get("code") or "").strip()
        explanation = _sanitize_placeholder_text(str(parsed_json.get("explanation") or text), prompt)
        return _generated_payload(
            code=code,
            explanation=explanation,
            answer_type=str(parsed_json.get("answer_type") or ("code" if code else "text")),
            expected_output=str(parsed_json.get("expected_output") or _infer_expected_output(code, explanation)),
            warnings=_coerce_warning_list(parsed_json.get("warnings")),
        )

    code, explanation = _extract_python_code(text)
    if not code:
        return _generated_payload(
            code="",
            explanation=_sanitize_placeholder_text(text, prompt),
            answer_type="text",
            expected_output="text",
        )

    return _generated_payload(
        code=code,
        explanation=_sanitize_placeholder_text(explanation, prompt),
        answer_type="code",
        expected_output=_infer_expected_output(code, explanation),
    )


def _parse_json_object(text: str) -> dict[str, Any] | None:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _coerce_warning_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _infer_expected_output(code: str, explanation: str) -> str:
    combined = f"{code}\n{explanation}".lower()
    has_chart = any(token in combined for token in ["plt.", "sns.", "plot(", "hist(", "bar(", "scatter("])
    has_table = "print_table" in combined or "|" in explanation or ".groupby(" in combined or ".agg(" in combined
    if has_chart and has_table:
        return "chart_table"
    if has_chart:
        return "chart"
    if has_table:
        return "table"
    return "text"


def _has_unresolved_placeholders(text: str) -> bool:
    return bool(PLACEHOLDER_PATTERN.search(text))


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


def _sanitize_history(history: list[dict[str, Any]]) -> list[dict[str, str]]:
    clean_messages: list[dict[str, str]] = []

    for item in history[-MAX_HISTORY_MESSAGES:]:
        role = item.get("role")
        if role not in {"user", "assistant"}:
            continue

        content = _history_message_content(item, role)
        if not content:
            continue

        clean_messages.append(
            {
                "role": role,
                "content": content[:MAX_HISTORY_CONTENT_CHARS],
            }
        )

    return clean_messages


def _history_message_content(item: dict[str, Any], role: str) -> str:
    content_parts = [str(item.get("content") or "").strip()]
    if role == "assistant" and item.get("output"):
        content_parts.append("Kết quả lần trước:\n" + str(item.get("output") or "").strip())
    if role == "assistant" and item.get("code"):
        content_parts.append("Code lần trước:\n```python\n" + str(item.get("code") or "").strip() + "\n```")
    return "\n\n".join(part for part in content_parts if part)


def generate_analysis_from_data(prompt: str, stdout: str) -> str:
    if not settings.openrouter_api_key or not stdout.strip():
        return _fallback_analysis_from_stdout(prompt, stdout)

    try:
        analysis = _call_openrouter(
            messages=_build_analysis_messages(prompt, stdout),
            temperature=0.3,
            max_tokens=ANALYSIS_MAX_TOKENS,
        )
        return analysis.strip() or _fallback_analysis_from_stdout(prompt, stdout)
    except Exception:
        return _fallback_analysis_from_stdout(prompt, stdout)


def _build_analysis_messages(prompt: str, stdout: str) -> list[dict[str, str]]:
    return [
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
    ]


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
    try:
        with urllib.request.urlopen(_openrouter_request(messages, temperature, max_tokens), timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenRouter HTTP {exc.code}: {detail}") from exc

    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError("OpenRouter trả về response không hợp lệ.") from exc


def _openrouter_request(
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> urllib.request.Request:
    payload = {
        "model": settings.openrouter_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    return urllib.request.Request(
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
    if "402" in raw_error or "more credits" in raw_error.lower() or "fewer max_tokens" in raw_error.lower():
        token_match = re.search(r"can only afford\s+(\d+)", raw_error, flags=re.IGNORECASE)
        token_detail = f" Tài khoản hiện chỉ đủ khoảng {token_match.group(1)} token output cho request này." if token_match else ""
        return "OpenRouter không đủ credit hoặc giới hạn token cho request hiện tại." + token_detail

    return "Không thể kết nối với OpenRouter API. Vui lòng kiểm tra API key, mạng, credit hoặc trạng thái model."
