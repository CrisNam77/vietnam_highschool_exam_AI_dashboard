"""Validation and reporting helpers for the preprocessing pipeline."""

from pathlib import Path
from typing import Any

import pandas as pd

from src.clean_data import SCORE_COLS
from src.feature_engineering import COMBINATION_COLS


def markdown_table(df: pd.DataFrame) -> str:
    """Render a small dataframe as Markdown without optional tabulate dependency."""
    if df.empty:
        return "_No rows._"
    safe_df = df.copy()
    safe_df = safe_df.astype(object).where(pd.notna(safe_df), "")
    columns = [str(col) for col in safe_df.columns]
    rows = [
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join("---" for _ in columns) + " |",
    ]
    for _, row in safe_df.iterrows():
        rows.append("| " + " | ".join(str(row[col]) for col in safe_df.columns) + " |")
    return "\n".join(rows)


def check_course_requirements(df: pd.DataFrame) -> dict[str, bool]:
    return {
        "final_data.csv has more than 2,000 rows": len(df) > 2000,
        "final_data.csv has at least 7 meaningful variables": len(df.columns) >= 7,
        "dataset is Vietnam-related": {"ten_tinh", "vung_mien", "sbd"}.issubset(df.columns),
        "all dashboard-needed subject columns exist": set(SCORE_COLS).issubset(df.columns),
        "all dashboard-needed combination columns exist": set(COMBINATION_COLS).issubset(df.columns),
    }


def build_validation_summary(df: pd.DataFrame, metadata: dict[str, Any]) -> dict[str, Any]:
    """Build validation metrics for reports and console output."""
    output_path = metadata.get("output_path")
    output_path = Path(output_path) if output_path else None
    clean_stats = metadata.get("clean_stats", {})
    raw_metadata = metadata.get("raw_metadata", {})

    year_distribution = df["nam"].value_counts().sort_index().rename_axis("nam").reset_index(name="rows")
    program_distribution = df.groupby(["nam", "chuong_trinh"]).size().reset_index(name="rows")
    score_quality = pd.DataFrame(
        {
            "missing": df[SCORE_COLS].isna().sum(),
            "non_null": df[SCORE_COLS].notna().sum(),
            "min": df[SCORE_COLS].min(),
            "max": df[SCORE_COLS].max(),
            "out_of_bounds_set_nan": pd.Series(clean_stats.get("out_of_bounds_by_col", {})),
        }
    ).reset_index(names="column")

    file_size_mb = None
    if output_path and output_path.exists():
        file_size_mb = output_path.stat().st_size / 1024 / 1024

    return {
        "output_path": str(output_path) if output_path else "data/processed/final_data.csv",
        "file_size_mb": file_size_mb,
        "shape": (len(df), len(df.columns)),
        "columns": list(df.columns),
        "first_rows": df.head(),
        "year_distribution": year_distribution,
        "program_distribution": program_distribution,
        "unique_ma_tinh": df["ma_tinh"].nunique(),
        "unique_ten_tinh": df["ten_tinh"].nunique(),
        "unique_vung_mien": df["vung_mien"].nunique(),
        "unique_vung_3": df["vung_3"].nunique(),
        "score_quality": score_quality,
        "clean_stats": clean_stats,
        "raw_metadata": raw_metadata,
        "course_checks": check_course_requirements(df),
    }


def _raw_file_lines(raw_metadata: dict[str, Any]) -> list[str]:
    lines: list[str] = []
    for item in raw_metadata.get("files", []):
        status = item.get("status", "unknown")
        line = f"- `{item.get('file')}`: {status}"
        if status == "used":
            line += f", {item.get('rows')} rows, year {item.get('year')}, program {item.get('program')}"
            columns = item.get("columns", [])
            line += f"\n  - Original columns: {', '.join(f'`{col}`' for col in columns)}"
        lines.append(line)
    return lines


def build_clean_run_report(summary: dict[str, Any]) -> str:
    """Build the detailed generated processing report."""
    raw_metadata = summary["raw_metadata"]
    clean_stats = summary["clean_stats"]
    english_years = ", ".join(str(year) for year in raw_metadata.get("english_assumption_years", [])) or "none"
    file_size = summary["file_size_mb"]
    size_text = f"{file_size:.2f} MB" if file_size is not None else "unknown until written"
    rows, cols = summary["shape"]

    lines = [
        "# Thống kê và quy trình xử lý dữ liệu",
        "",
        "## 1. Mục tiêu xử lý",
        "Pipeline này tạo `data/processed/final_data.csv` ở định dạng wide để phục vụ dashboard và AI Assistant.",
        "",
        "## 2. Dữ liệu đầu vào",
        *_raw_file_lines(raw_metadata),
        "",
        "## 3. Chuẩn hóa schema",
        "- Chuẩn hóa các tên cột SBD như `sbd`, `SBD`, `SOBAODANH`, `SoBaoDanh`, `Số báo danh` về `sbd`.",
        "- Chuẩn hóa cột điểm về snake_case: `toan`, `ngu_van`, `ngoai_ngu`, `vat_li`, `hoa_hoc`, `sinh_hoc`, `lich_su`, `dia_li`, `gdcd`, `tin_hoc`, `cong_nghe_cn`, `cong_nghe_nn`, `gd_ktpl`.",
        "- Gắn `nam` và `chuong_trinh` theo nguồn dữ liệu.",
        "- Giữ quy ước tên cột cuối cùng trong `docs/data_schema.md`.",
        "",
        "## 4. Xử lý số báo danh",
        "- Loại ký tự không phải chữ số và bỏ hậu tố `.0` nếu Excel lưu SBD như số.",
        "- Bổ sung số 0 đầu bằng `zfill(8)`.",
        "- Trích `ma_tinh` từ hai chữ số đầu của SBD gốc.",
        f"- Số dòng bị loại do SBD không hợp lệ: {clean_stats.get('dropped_invalid_sbd', 0)}.",
        "",
        "## 5. Ánh xạ tỉnh/thành và vùng miền",
        "- `ma_tinh` đến từ prefix SBD gốc.",
        "- `ten_tinh` là tên tỉnh/thành sau sáp nhập dùng cho phiên bản dashboard này.",
        "- `vung_mien` là nhóm 6 vùng kinh tế xã hội.",
        "- `vung_3` là nhóm Bắc/Trung/Nam.",
        "- Việc ánh xạ về tỉnh/thành sau sáp nhập là lựa chọn có chủ đích để so sánh xuyên năm.",
        f"- Số dòng bị loại do không ánh xạ được tỉnh/thành: {clean_stats.get('dropped_strange_province', 0)}.",
        "",
        "## 6. Làm sạch điểm thi",
        "- Chuyển toàn bộ cột điểm sang numeric.",
        "- Giữ điểm thiếu là NaN, không điền điểm thay thế.",
        "- Chuyển điểm ngoài khoảng [0, 10] thành NaN và ghi nhận số lượng.",
        "- Không tạo dữ liệu điểm không có trong nguồn.",
        f"- Tổng ô điểm ngoài khoảng [0, 10] đã chuyển thành NaN: {clean_stats.get('out_of_bounds_total', 0)}.",
        "",
        "## 7. Tạo biến dẫn xuất",
        "- `so_mon`: số môn có điểm hợp lệ.",
        "- `diem_tb`: trung bình các môn có điểm, bỏ qua NaN.",
        "- `ban`: suy luận KHTN/KHXH/Khác cho CT2006 dựa trên nhóm môn có điểm.",
        "- `diem_anh`: dung `ngoai_ngu` chi khi `ma_ngoai_ngu == N1`; cac ma ngoai ngu khac duoc giu la NaN cho cac to hop can tieng Anh.",
        "- Điểm tổ hợp chỉ có giá trị khi đủ các môn thành phần, theo phép cộng Pandas nên thiếu một môn sẽ ra NaN.",
        f"- Số dòng bị loại do không có môn điểm nào (`so_mon == 0`): {clean_stats.get('dropped_so_mon_zero', 0)}.",
        "",
        "## 8. Các giả định quan trọng",
        "- Ánh xạ tỉnh/thành sau sáp nhập là chủ đích.",
        "- Ma ngoai ngu duoc ton trong khi tao `diem_anh`; khong gan tat ca diem ngoai ngu thanh tieng Anh.",
        "- `diem_tb` tính trên tất cả môn có điểm, không chỉ các môn chung.",
        f"- Bản ghi trùng khóa `nam`, `chuong_trinh`, `sbd` chỉ được báo cáo, không tự động loại: {clean_stats.get('duplicate_key_count', 0)}.",
        "- `final_data.csv` quá lớn để commit và tiếp tục được ignore bởi git.",
        "",
        "## 9. Dữ liệu đầu ra",
        f"- Output path: `{summary['output_path']}`",
        f"- File size: {size_text}",
        f"- Shape: {rows} rows x {cols} columns",
        f"- Unique `ma_tinh`: {summary['unique_ma_tinh']}",
        f"- Unique `ten_tinh`: {summary['unique_ten_tinh']}",
        f"- Unique `vung_mien`: {summary['unique_vung_mien']}",
        f"- Unique `vung_3`: {summary['unique_vung_3']}",
        "- Final columns:",
        ", ".join(f"`{col}`" for col in summary["columns"]),
        "",
        "### Year distribution",
        markdown_table(summary["year_distribution"]),
        "",
        "### Program distribution",
        markdown_table(summary["program_distribution"]),
        "",
        "## 10. Kiểm tra yêu cầu môn học",
    ]
    lines.extend(f"- {'PASS' if passed else 'FAIL'}: {name}" for name, passed in summary["course_checks"].items())
    lines.extend(
        [
            "",
            "## 11. Hạn chế và điểm cần quyết định sau",
            "- Chưa giữ riêng tên tỉnh cũ; nếu cần phân tích theo địa giới lịch sử thì nên thêm cột riêng trong một phiên bản schema sau.",
            "- CT2006 và CT2018 khác chương trình, cần so sánh thận trọng.",
            "- Chat luong ma ngoai ngu phu thuoc nguon raw va can duoc kiem tra khi doi nguon du lieu.",
            "- Kích thước `final_data.csv` lớn; nên commit code/report hoặc sample nhỏ thay vì commit toàn bộ dữ liệu.",
            "",
            "## Score column quality",
            markdown_table(summary["score_quality"]),
        ]
    )
    return "\n".join(lines) + "\n"


def build_data_quality_report(summary: dict[str, Any]) -> str:
    """Build the concise presentation-oriented data quality report."""
    clean_stats = summary["clean_stats"]
    file_size = summary["file_size_mb"]
    size_text = f"{file_size:.2f} MB" if file_size is not None else "unknown until written"
    rows, cols = summary["shape"]

    lines = [
        "# Data Quality Report",
        "",
        "## Dataset Source",
        "The dataset combines Vietnam high school graduation exam score files from 2022 to 2026, including CSV and XLSX sources. The generated output is `data/processed/final_data.csv` in wide format.",
        "",
        "## Processing Pipeline",
        "The pipeline loads available raw files, normalizes source columns, cleans SBD and score values, maps province/region metadata, adds derived fields, writes the processed CSV, and generates validation reports.",
        "",
        "## Final Output",
        f"- Path: `{summary['output_path']}`",
        f"- File size: {size_text}",
        f"- Shape: {rows} rows x {cols} columns",
        f"- Unique `ten_tinh`: {summary['unique_ten_tinh']}",
        f"- Unique `vung_mien`: {summary['unique_vung_mien']}",
        "",
        "## Final Schema",
        ", ".join(f"`{col}`" for col in summary["columns"]),
        "",
        "## Quality Checks",
        f"- Invalid SBD rows removed: {clean_stats.get('dropped_invalid_sbd', 0)}",
        f"- Province mapping failures removed: {clean_stats.get('dropped_strange_province', 0)}",
        f"- Empty-score rows removed: {clean_stats.get('dropped_so_mon_zero', 0)}",
        f"- Scores outside [0, 10] set to NaN: {clean_stats.get('out_of_bounds_total', 0)}",
        f"- Duplicate keys reported, not removed: {clean_stats.get('duplicate_key_count', 0)}",
        "",
        "## Year Distribution",
        markdown_table(summary["year_distribution"]),
        "",
        "## Program Distribution",
        markdown_table(summary["program_distribution"]),
        "",
        "## Course Requirement Fit",
    ]
    lines.extend(f"- {'PASS' if passed else 'FAIL'}: {name}" for name, passed in summary["course_checks"].items())
    lines.extend(
        [
            "",
            "## Assumptions",
            "- Province/city names use the post-merger mapping for this project version.",
            "- Missing subject scores remain NaN.",
            "- `diem_tb` averages all available subject scores.",
            "- `diem_anh` is derived only from rows where `ma_ngoai_ngu == N1`.",
            "",
            "## Limitations",
            "- Historical province names are not kept as separate columns.",
            "- CT2006 and CT2018 rows are not fully comparable without program-aware filtering.",
            "- Language-code quality depends on the raw source and should be checked when changing sources.",
            "- `final_data.csv` is large and should remain ignored by git.",
        ]
    )
    return "\n".join(lines) + "\n"
