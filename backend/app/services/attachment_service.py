import base64
import io
import re
import uuid
from typing import Any

import pandas as pd
from fastapi import UploadFile

from backend.app.schemas.attachments import AttachmentSummary


MAX_TABLE_FILE_BYTES = 50 * 1024 * 1024
MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024
SUPPORTED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}
SUPPORTED_TABLE_EXTENSIONS = {".csv", ".xlsx", ".xls"}


def analyze_upload(file: UploadFile, content: bytes) -> AttachmentSummary:
    filename = file.filename or "attachment"
    content_type = file.content_type or "application/octet-stream"
    suffix = _file_suffix(filename)

    if content_type in SUPPORTED_IMAGE_TYPES:
        return _summarize_image(filename, content_type, content)

    if suffix in SUPPORTED_TABLE_EXTENSIONS:
        return _summarize_table(filename, content_type, suffix, content)

    raise ValueError("Chỉ hỗ trợ CSV, XLSX/XLS và ảnh PNG/JPEG/WebP.")


def _summarize_image(filename: str, content_type: str, content: bytes) -> AttachmentSummary:
    if len(content) > MAX_IMAGE_FILE_BYTES:
        raise ValueError("Ảnh vượt quá giới hạn 8MB.")

    encoded = base64.b64encode(content).decode("ascii")
    summary = "\n".join(
        [
            f"Tệp ảnh: {filename}",
            f"Loại ảnh: {content_type}",
            f"Kích thước: {_format_bytes(len(content))}",
            "Ảnh này được gửi kèm cho model vision. Nếu model hiện tại không hỗ trợ image input, hãy yêu cầu người dùng đổi sang model có vision.",
        ]
    )
    return AttachmentSummary(
        id=str(uuid.uuid4()),
        filename=filename,
        kind="image",
        content_type=content_type,
        size_bytes=len(content),
        summary=summary,
        data_url=f"data:{content_type};base64,{encoded}",
    )


def _summarize_table(filename: str, content_type: str, suffix: str, content: bytes) -> AttachmentSummary:
    if len(content) > MAX_TABLE_FILE_BYTES:
        raise ValueError("File bảng vượt quá giới hạn 50MB.")

    if suffix == ".csv":
        dataframe = pd.read_csv(io.BytesIO(content), nrows=1000)
        row_hint = _count_csv_rows(content)
        source_detail = f"CSV, đọc sample tối đa 1.000 dòng. Ước tính số dòng: {row_hint:,}."
    else:
        excel = pd.ExcelFile(io.BytesIO(content))
        sheet_name = excel.sheet_names[0]
        dataframe = pd.read_excel(excel, sheet_name=sheet_name, nrows=1000)
        source_detail = f"Excel sheet đầu tiên: `{sheet_name}`, đọc sample tối đa 1.000 dòng. Các sheet: {', '.join(excel.sheet_names[:8])}."

    summary = _table_summary(filename, source_detail, dataframe)
    return AttachmentSummary(
        id=str(uuid.uuid4()),
        filename=filename,
        kind="table",
        content_type=content_type,
        size_bytes=len(content),
        summary=summary,
    )


def _table_summary(filename: str, source_detail: str, dataframe: pd.DataFrame) -> str:
    safe_columns = [str(column) for column in dataframe.columns]
    dtype_lines = [f"- `{column}`: `{dataframe[column].dtype}`" for column in dataframe.columns[:40]]
    missing = dataframe.isna().mean().sort_values(ascending=False).head(10)
    missing_lines = [f"- `{column}`: {rate:.1%}" for column, rate in missing.items() if rate > 0]
    sample = dataframe.head(8).to_markdown(index=False)

    return "\n".join(
        [
            "### Dataset người dùng upload",
            f"Tên file: `{filename}`",
            source_detail,
            f"Số cột: {len(safe_columns)}",
            "",
            "Cột và kiểu dữ liệu:",
            *dtype_lines,
            "",
            "Tỷ lệ thiếu cao nhất trong sample:",
            *(missing_lines or ["- Không thấy giá trị thiếu trong sample."]),
            "",
            "Sample dữ liệu:",
            sample,
            "",
            "Khi phân tích file upload này, hãy sinh code dùng DataFrame tạm `uploaded_df` nếu backend hỗ trợ runtime riêng; nếu không, hãy dùng schema/sample trên để giải thích hoặc đề xuất cách phân tích, không ghi đè `df` điểm thi chính.",
        ]
    )


def _file_suffix(filename: str) -> str:
    match = re.search(r"(\.[A-Za-z0-9]+)$", filename)
    return match.group(1).lower() if match else ""


def _count_csv_rows(content: bytes) -> int:
    if not content:
        return 0
    return max(content.count(b"\n"), 1)


def _format_bytes(size: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024

