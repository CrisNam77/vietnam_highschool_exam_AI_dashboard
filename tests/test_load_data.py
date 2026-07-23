from pathlib import Path

import pytest

from src.load_data import discover_raw_files, load_processed_data, normalize_column_name


def test_load_processed_data_missing_file_raises_clear_error(tmp_path: Path):
    missing_path = tmp_path / "missing.csv"

    with pytest.raises(FileNotFoundError, match="Processed data file not found"):
        load_processed_data(missing_path)


def test_normalize_github_raw_columns():
    assert normalize_column_name("Toan") == "toan"
    assert normalize_column_name("NguVan") == "ngu_van"
    assert normalize_column_name("KinhTePhapLuat") == "gd_ktpl"
    assert normalize_column_name("MaMonNgoaiNgu") == "ma_ngoai_ngu"


def test_discover_raw_files_accepts_github_txt_names(tmp_path: Path):
    for name in [
        "du_lieu_diem_thi_2022.txt",
        "du_lieu_diem_thi_2023.txt",
        "du_lieu_diem_thi_2024.txt",
        "du-lieu-diem-thi-2025-ct2006.txt",
        "du-lieu-diem-thi-2025-ct2018.txt",
        "du_lieu_diem_thi_2026.txt",
    ]:
        (tmp_path / name).write_text("SBD,Toan\n01000001,8.0\n", encoding="utf-8")

    metadata = discover_raw_files(tmp_path)

    assert [item["status"] for item in metadata["files"]] == ["found"] * 6
    assert metadata["files"][-1]["name"] == "du_lieu_diem_thi_2026.txt"
