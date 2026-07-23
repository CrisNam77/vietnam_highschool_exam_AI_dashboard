import io

from fastapi import UploadFile
from starlette.datastructures import Headers

from backend.app.services.attachment_service import analyze_upload


def test_analyze_csv_upload_returns_schema_summary():
    content = b"name,score\nAn,8.5\nBinh,\n"
    file = UploadFile(file=io.BytesIO(content), filename="sample.csv", headers=Headers({"content-type": "text/csv"}))

    summary = analyze_upload(file, content)

    assert summary.kind == "table"
    assert summary.filename == "sample.csv"
    assert "`score`" in summary.summary
    assert "Sample dữ liệu" in summary.summary
    assert summary.data_url is None


def test_analyze_image_upload_returns_data_url():
    content = b"\x89PNG\r\n\x1a\n"
    file = UploadFile(file=io.BytesIO(content), filename="chart.png", headers=Headers({"content-type": "image/png"}))

    summary = analyze_upload(file, content)

    assert summary.kind == "image"
    assert summary.data_url is not None
    assert summary.data_url.startswith("data:image/png;base64,")
