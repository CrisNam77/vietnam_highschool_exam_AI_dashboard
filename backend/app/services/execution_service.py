import base64
from contextlib import contextmanager
import io
import re
import sys
import traceback
from collections.abc import Callable, Iterator

import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

import src.viz as viz


SUBJECT_COLS = [
    "toan",
    "ngu_van",
    "ngoai_ngu",
    "vat_li",
    "hoa_hoc",
    "sinh_hoc",
    "lich_su",
    "dia_li",
    "gdcd",
    "tin_hoc",
    "cong_nghe_cn",
    "cong_nghe_nn",
    "gd_ktpl",
]

COMBINATION_COLS = [
    "diem_khoi_a00",
    "diem_khoi_a01",
    "diem_khoi_a02",
    "diem_khoi_b00",
    "diem_khoi_b08",
    "diem_khoi_c00",
    "diem_khoi_c03",
    "diem_khoi_c04",
    "diem_khoi_d01",
    "diem_khoi_d07",
    "diem_khoi_d14",
    "diem_khoi_d15",
]

SUBJECT_LABELS = {
    "toan": "Toán",
    "ngu_van": "Ngữ văn",
    "ngoai_ngu": "Ngoại ngữ",
    "vat_li": "Vật lí",
    "hoa_hoc": "Hóa học",
    "sinh_hoc": "Sinh học",
    "lich_su": "Lịch sử",
    "dia_li": "Địa lí",
    "gdcd": "GDCD",
    "tin_hoc": "Tin học",
    "cong_nghe_cn": "Công nghệ CN",
    "cong_nghe_nn": "Công nghệ NN",
    "gd_ktpl": "GDKTPL",
    "diem_anh": "Tiếng Anh",
    "diem_tb": "Điểm TB",
    "diem_khoi_a00": "A00",
    "diem_khoi_a01": "A01",
    "diem_khoi_a02": "A02",
    "diem_khoi_b00": "B00",
    "diem_khoi_b08": "B08",
    "diem_khoi_c00": "C00",
    "diem_khoi_c03": "C03",
    "diem_khoi_c04": "C04",
    "diem_khoi_d01": "D01",
    "diem_khoi_d07": "D07",
    "diem_khoi_d14": "D14",
    "diem_khoi_d15": "D15",
}

COLUMN_ALIASES = {
    "Toán": "toan",
    "toán": "toan",
    "Điểm Toán": "toan",
    "Ngu van": "ngu_van",
    "Ngữ văn": "ngu_van",
    "Văn": "ngu_van",
    "điểm văn": "ngu_van",
    "Tiếng Anh": "diem_anh",
    "Anh": "diem_anh",
    "Điểm Anh": "diem_anh",
    "Ngoại ngữ": "ngoai_ngu",
    "ngoại ngữ": "ngoai_ngu",
    "Vật lí": "vat_li",
    "Vật lý": "vat_li",
    "Lý": "vat_li",
    "Hóa học": "hoa_hoc",
    "Hoá học": "hoa_hoc",
    "Hóa": "hoa_hoc",
    "Hoá": "hoa_hoc",
    "Sinh học": "sinh_hoc",
    "Sinh": "sinh_hoc",
    "Lịch sử": "lich_su",
    "Sử": "lich_su",
    "Địa lí": "dia_li",
    "Địa lý": "dia_li",
    "Địa": "dia_li",
    "Giáo dục công dân": "gdcd",
    "Tin học": "tin_hoc",
    "Công nghệ CN": "cong_nghe_cn",
    "Công nghệ NN": "cong_nghe_nn",
    "GDKT&PL": "gd_ktpl",
    "GD KTPL": "gd_ktpl",
    "Điểm trung bình": "diem_tb",
    "Diem TB": "diem_tb",
    "A00": "diem_khoi_a00",
    "A01": "diem_khoi_a01",
    "A02": "diem_khoi_a02",
    "B00": "diem_khoi_b00",
    "B08": "diem_khoi_b08",
    "C00": "diem_khoi_c00",
    "C03": "diem_khoi_c03",
    "C04": "diem_khoi_c04",
    "D01": "diem_khoi_d01",
    "D07": "diem_khoi_d07",
    "D14": "diem_khoi_d14",
    "D15": "diem_khoi_d15",
}

REGION_LABELS = {
    "Miền Bắc": "Bắc",
    "miền Bắc": "Bắc",
    "Bắc Bộ": "Bắc",
    "miền bắc": "Bắc",
    "Miền Trung": "Trung",
    "miền Trung": "Trung",
    "miền trung": "Trung",
    "Miền Nam": "Nam",
    "miền Nam": "Nam",
    "Nam Bộ": "Nam",
    "miền nam": "Nam",
}

TRACK_LABELS = {
    "Khoa học tự nhiên": "KHTN",
    "khoa học tự nhiên": "KHTN",
    "Tự nhiên": "KHTN",
    "tự nhiên": "KHTN",
    "Khoa học xã hội": "KHXH",
    "khoa học xã hội": "KHXH",
    "Xã hội": "KHXH",
    "xã hội": "KHXH",
}

PROVINCE_LABELS = {
    "Hà Nội": "Hà Nội",
    "Ha Noi": "Hà Nội",
    "TP.HCM": "Hồ Chí Minh",
    "TP HCM": "Hồ Chí Minh",
    "TP Hồ Chí Minh": "Hồ Chí Minh",
    "Thành phố Hồ Chí Minh": "Hồ Chí Minh",
    "Hồ Chí Minh": "Hồ Chí Minh",
    "Huế": "Huế",
    "Thừa Thiên Huế": "Huế",
    "Thanh Hóa": "Thanh Hóa",
    "Thanh Hoá": "Thanh Hóa",
    "Đà Nẵng": "Đà Nẵng",
}


pd.options.mode.copy_on_write = True
PLACEHOLDER_PATTERN = re.compile(r"\{[a-zA-Z_][a-zA-Z0-9_]*(?:\[[^\]]+\])?(?::[^}]*)?\}")


class LinearRegression:
    """Fallback nhỏ cho các đoạn code AI lỡ dùng sklearn LinearRegression."""

    def fit(self, x, y):
        x_array = np.asarray(x, dtype=float)
        y_array = np.asarray(y, dtype=float).reshape(-1)
        if x_array.ndim == 1:
            x_array = x_array.reshape(-1, 1)
        design = np.column_stack([np.ones(len(x_array)), x_array])
        params, *_ = np.linalg.lstsq(design, y_array, rcond=None)
        self.intercept_ = float(params[0])
        self.coef_ = params[1:]
        return self

    def predict(self, x):
        x_array = np.asarray(x, dtype=float)
        if x_array.ndim == 1:
            x_array = x_array.reshape(-1, 1)
        return self.intercept_ + x_array @ self.coef_


def normalize_column_aliases(code: str) -> str:
    normalized = code
    for display_name, column_name in COLUMN_ALIASES.items():
        normalized = re.sub(
            rf"(['\"]){re.escape(display_name)}\1",
            lambda match: f"{match.group(1)}{column_name}{match.group(1)}",
            normalized,
        )
    return normalized


def normalize_unsupported_imports(code: str) -> str:
    return re.sub(
        r"^\s*from\s+sklearn\.linear_model\s+import\s+LinearRegression\s*$",
        "# LinearRegression fallback is provided by the execution environment",
        code,
        flags=re.MULTILINE,
    )


def normalize_sbd_modulo(code: str) -> str:
    sbd_selector = r"((?:[A-Za-z_][A-Za-z0-9_]*|\([^()\n]+\))\s*\[\s*['\"]sbd['\"]\s*\])"
    return re.sub(
        rf"{sbd_selector}\s*%\s*2",
        r"pd.to_numeric(\1, errors='coerce') % 2",
        code,
    )


def _normalize_equality_filter(code: str, column: str, labels: dict[str, str]) -> str:
    normalized = code
    for display_value, data_value in labels.items():
        normalized = re.sub(
            rf"(\[['\"]){column}(['\"]\]\s*==\s*['\"]){re.escape(display_value)}(['\"])",
            rf"\1{column}\2{data_value}\3",
            normalized,
        )
    return normalized


def _normalize_isin_values(code: str, column: str, labels: dict[str, str]) -> str:
    normalized = code
    for display_value, data_value in labels.items():
        normalized = re.sub(
            rf"(['\"]){re.escape(display_value)}(['\"])",
            rf"\1{data_value}\2",
            normalized,
        )
    return normalized


def normalize_region_filters(code: str) -> str:
    normalized = _normalize_equality_filter(code, "vung_mien", REGION_LABELS)
    normalized = _normalize_isin_values(normalized, "vung_mien", REGION_LABELS)
    if normalized != code:
        normalized = normalized.replace("['vung_mien']", "['vung_3']").replace('["vung_mien"]', '["vung_3"]')
    return normalized


def normalize_track_filters(code: str) -> str:
    return _normalize_equality_filter(code, "ban", TRACK_LABELS)


def normalize_province_filters(code: str) -> str:
    normalized = code
    for display_value, contains_value in PROVINCE_LABELS.items():
        normalized = re.sub(
            rf"((?:[A-Za-z_][A-Za-z0-9_]*|\([^()\n]+\))\s*\[\s*['\"]ten_tinh['\"]\s*\])\s*==\s*(['\"]){re.escape(display_value)}\2",
            rf"\1.str.contains('{contains_value}', case=False, na=False)",
            normalized,
        )
    return normalized


CODE_NORMALIZERS: tuple[Callable[[str], str], ...] = (
    normalize_column_aliases,
    normalize_unsupported_imports,
    normalize_sbd_modulo,
    normalize_region_filters,
    normalize_track_filters,
    normalize_province_filters,
)


def normalize_code(code: str) -> str:
    normalized = code
    for normalizer in CODE_NORMALIZERS:
        normalized = normalizer(normalized)
    return normalized


def _format_markdown_value(value) -> str:
    if pd.isna(value):
        return "-"
    if isinstance(value, (float, np.floating)):
        return f"{value:.2f}".rstrip("0").rstrip(".")
    return str(value).replace("|", "\\|")


def _markdown_table(table: pd.DataFrame) -> str:
    columns = [str(column) for column in table.columns]
    aligns = [
        ":---"
        if str(column) in {"ma_tinh", "sbd", "ma_ngoai_ngu"}
        else "---:"
        if pd.to_numeric(table[column].replace("-", np.nan), errors="coerce").notna().any()
        else ":---"
        for column in table.columns
    ]
    lines = [
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join(aligns) + " |",
    ]
    for row in table.itertuples(index=False, name=None):
        lines.append("| " + " | ".join(_format_markdown_value(value) for value in row) + " |")
    return "\n".join(lines)


def print_table(data, max_rows: int = 20) -> None:
    table = data.copy() if isinstance(data, pd.DataFrame) else pd.DataFrame(data)
    table = table.head(max_rows).round(2).astype("object").where(pd.notna(table), "-")
    print(f"\n{_markdown_table(table)}\n")


def top_province_average(df: pd.DataFrame, n: int = 10, subject_cols: list[str] | None = None) -> pd.DataFrame:
    cols = [column for column in (subject_cols or SUBJECT_COLS) if column in df.columns]
    values = df[cols].to_numpy(dtype=np.float32, copy=False)
    row_average = np.nanmean(values, axis=1)
    result = (
        pd.DataFrame(
            {
                "ma_tinh": df["ma_tinh"].to_numpy(copy=False),
                "ten_tinh": df["ten_tinh"].to_numpy(copy=False),
                "diem_trung_binh": row_average,
            }
        )
        .groupby(["ma_tinh", "ten_tinh"], sort=False, observed=True)["diem_trung_binh"]
        .mean()
        .nlargest(n)
        .reset_index()
    )
    return result


def _has_markdown_table(text: str) -> bool:
    return bool(re.search(r"^\|.+\|\s*\n\|[\s:|\-]+\|", text, re.MULTILINE))


def _find_result_dataframe(exec_globals: dict) -> pd.DataFrame | None:
    ignored_names = {"df"}
    preferred_keywords = ("result", "top", "summary", "bang", "table", "tb_")
    candidates: list[tuple[int, str, pd.DataFrame]] = []

    for name, value in exec_globals.items():
        if name in ignored_names or name.startswith("_"):
            continue
        if not isinstance(value, pd.DataFrame) or value.empty:
            continue
        if len(value) > 100:
            continue

        priority = 0 if any(keyword in name.lower() for keyword in preferred_keywords) else 1
        candidates.append((priority, name, value))

    if not candidates:
        return None

    candidates.sort(key=lambda item: (item[0], len(item[2])))
    return candidates[0][2]


def _detect_year_filter(code: str) -> int | None:
    match = re.search(r"nam['\"]?\]?\s*(?:==|=)\s*(20(?:22|23|24|25|26))", code)
    if not match:
        match = re.search(r"\b(20(?:22|23|24|25|26))\b", code)
    return int(match.group(1)) if match else None


def _detect_subject(code: str) -> str | None:
    candidate_cols = [*SUBJECT_COLS, "diem_anh", "diem_tb", *COMBINATION_COLS]
    subject_hits = [
        subject
        for subject in candidate_cols
        if re.search(rf"(['\"]){re.escape(subject)}\1", code)
    ]
    if not subject_hits:
        lower_code = code.lower()
        for display_name, column_name in COLUMN_ALIASES.items():
            if display_name.lower() in lower_code:
                subject_hits.append(column_name)
    return subject_hits[0] if subject_hits else None


def _auto_distribution_insight(code: str, df: pd.DataFrame) -> str:
    if not re.search(r"hist|histplot|phổ điểm|distribution|distplot", code, re.IGNORECASE):
        return ""

    subject = _detect_subject(code)
    if subject not in df.columns:
        return ""

    year = _detect_year_filter(code)
    data = df
    if year is not None and "nam" in data.columns:
        data = data[data["nam"] == year]

    scores = pd.to_numeric(data[subject], errors="coerce").dropna()
    if scores.empty:
        return ""

    score_max = 30 if subject in COMBINATION_COLS else 10
    bins = np.arange(0, score_max + 0.25, 0.25)
    counts, edges = np.histogram(scores.to_numpy(dtype=float), bins=bins)
    peak_index = int(np.argmax(counts))
    peak_left = edges[peak_index]
    peak_right = edges[peak_index + 1]
    n = int(scores.size)
    mean = float(scores.mean())
    median = float(scores.median())
    std = float(scores.std())
    min_score = float(scores.min())
    max_score = float(scores.max())
    low_threshold = 15 if subject in COMBINATION_COLS else 5
    high_threshold = 24 if subject in COMBINATION_COLS else 8
    below_low = float((scores < low_threshold).mean() * 100)
    above_high = float((scores >= high_threshold).mean() * 100)
    subject_label = SUBJECT_LABELS.get(subject, subject)
    year_text = f" năm {year}" if year else ""

    return "\n".join(
        [
            f"### Kết quả & insight phổ điểm {subject_label}{year_text}",
            "",
            f"- Cỡ mẫu hợp lệ: **{n:,}** thí sinh.",
            f"- Điểm trung bình là **{mean:.2f}**, trung vị **{median:.2f}**, độ lệch chuẩn **{std:.2f}**.",
            f"- Điểm thấp nhất/cao nhất trong dữ liệu hợp lệ là **{min_score:.2f}** và **{max_score:.2f}**.",
            f"- Tỷ lệ dưới {low_threshold:g} điểm là **{below_low:.1f}%**, còn tỷ lệ từ {high_threshold:g} điểm trở lên là **{above_high:.1f}%**.",
            f"- Khoảng điểm đông nhất nằm quanh **{peak_left:.2f}-{peak_right:.2f}** với khoảng **{int(counts[peak_index]):,}** thí sinh.",
            "- Diễn giải: phổ điểm cho thấy mức tập trung chính của thí sinh và giúp nhận diện nhanh nhóm điểm thấp/cao thay vì chỉ nhìn hình dạng biểu đồ.",
        ]
    )


def _has_unresolved_placeholders(text: str) -> bool:
    return bool(PLACEHOLDER_PATTERN.search(text))


def _strip_placeholder_output(text: str) -> str:
    lines = [
        line
        for line in text.splitlines()
        if not _has_unresolved_placeholders(line)
        and not re.search(r"^\s*#{1,6}\s*k[ếe]\s*t qu[aả]\s*&\s*insight\s*$", line, re.IGNORECASE)
    ]
    return "\n".join(lines).strip()


def _build_exec_globals(df: pd.DataFrame) -> dict:
    return {
        "df": df,
        "pd": pd,
        "np": np,
        "plt": plt,
        "sns": sns,
        "viz": viz,
        "print_table": print_table,
        "top_province_average": top_province_average,
        "LinearRegression": LinearRegression,
    }


@contextmanager
def _captured_output() -> Iterator[tuple[io.StringIO, io.StringIO]]:
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = stdout_buffer
    sys.stderr = stderr_buffer
    try:
        yield stdout_buffer, stderr_buffer
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr


def _run_user_code(code: str, exec_globals: dict) -> tuple[bool, str, str]:
    success = True
    with _captured_output() as (stdout_buffer, stderr_buffer):
        try:
            exec(code, exec_globals)
        except Exception:
            success = False
            traceback.print_exc(file=stderr_buffer)

    return success, stdout_buffer.getvalue(), stderr_buffer.getvalue()


def _append_auto_distribution_insight(code: str, df: pd.DataFrame, stdout: str) -> str:
    if stdout.strip() and not _has_unresolved_placeholders(stdout):
        return stdout

    auto_insight = _auto_distribution_insight(code, df)
    if not auto_insight:
        return stdout

    stripped_stdout = _strip_placeholder_output(stdout)
    return auto_insight + (f"\n\n{stripped_stdout}\n" if stripped_stdout else "\n")


def _append_result_table_if_needed(stdout: str, exec_globals: dict) -> str:
    if stdout.strip() or _has_markdown_table(stdout):
        return stdout

    result_table = _find_result_dataframe(exec_globals)
    if result_table is None:
        return stdout

    table_buffer = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = table_buffer
    try:
        print_table(result_table)
    finally:
        sys.stdout = old_stdout

    return stdout + "\n### Bảng kết quả\n" + table_buffer.getvalue()


def _extract_plot_image(stderr: str) -> tuple[str | None, str]:
    plot_b64 = None
    try:
        if plt.get_fignums():
            image_buffer = io.BytesIO()
            plt.savefig(image_buffer, format="png", bbox_inches="tight", dpi=150)
            image_buffer.seek(0)
            plot_b64 = base64.b64encode(image_buffer.read()).decode("utf-8")
            plt.close("all")
    except Exception as exc:
        stderr += f"\nLỗi khi trích xuất biểu đồ: {exc}"
    return plot_b64, stderr


def execute_code(code: str, df: pd.DataFrame) -> dict:
    code = normalize_code(code)
    plt.close("all")
    execution_df = df.copy(deep=False)
    exec_globals = _build_exec_globals(execution_df)

    success, stdout, stderr = _run_user_code(code, exec_globals)

    if success:
        stdout = _append_auto_distribution_insight(code, execution_df, stdout)
        stdout = _append_result_table_if_needed(stdout, exec_globals)

    plot_b64, stderr = _extract_plot_image(stderr)

    return {
        "success": success,
        "stdout": stdout,
        "stderr": stderr,
        "plot_b64": plot_b64,
    }
