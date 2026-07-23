from pathlib import Path
from typing import Any
import unicodedata

import numpy as np
import pandas as pd

COLUMN_ALIASES = {
    "sbd": "sbd",
    "SBD": "sbd",
    "SOBAODANH": "sbd",
    "SoBaoDanh": "sbd",
    "Số báo danh": "sbd",
    "Nam": "nam_source",
    "Tinh": "tinh_source",
    "SBD_New": "sbd_source",
    "Toan": "toan",
    "Toán": "toan",
    "toan": "toan",
    "NguVan": "ngu_van",
    "Văn": "ngu_van",
    "ngu_van": "ngu_van",
    "NgoaiNgu": "ngoai_ngu",
    "Ngoại ngữ": "ngoai_ngu",
    "ngoai_ngu": "ngoai_ngu",
    "VatLy": "vat_li",
    "Lí": "vat_li",
    "Lý": "vat_li",
    "vat_li": "vat_li",
    "HoaHoc": "hoa_hoc",
    "Hóa": "hoa_hoc",
    "hoa_hoc": "hoa_hoc",
    "SinhHoc": "sinh_hoc",
    "Sinh": "sinh_hoc",
    "sinh_hoc": "sinh_hoc",
    "LichSu": "lich_su",
    "Sử": "lich_su",
    "lich_su": "lich_su",
    "DiaLy": "dia_li",
    "Địa": "dia_li",
    "dia_li": "dia_li",
    "GDCD": "gdcd",
    "Giáo dục công dân": "gdcd",
    "gdcd": "gdcd",
    "TinHoc": "tin_hoc",
    "Tin học": "tin_hoc",
    "tin_hoc": "tin_hoc",
    "CongNgheCongNghiep": "cong_nghe_cn",
    "Công nghệ công nghiệp": "cong_nghe_cn",
    "cong_nghe_cn": "cong_nghe_cn",
    "CongNgheNongNghiep": "cong_nghe_nn",
    "Công nghệ nông nghiệp": "cong_nghe_nn",
    "cong_nghe_nn": "cong_nghe_nn",
    "KinhTePhapLuat": "gd_ktpl",
    "Giáo dục kinh tế và pháp luật": "gd_ktpl",
    "GD Kinh tế - Pháp luật": "gd_ktpl",
    "gd_ktpl": "gd_ktpl",
    "MaMonNgoaiNgu": "ma_ngoai_ngu",
    "Mã môn ngoại ngữ": "ma_ngoai_ngu",
    "ma_ngoai_ngu": "ma_ngoai_ngu",
}

RAW_SPECS = [
    {
        "name": "du_lieu_diem_thi_2022.txt",
        "year": 2022,
        "program": "2006",
        "kind": "csv",
        "fallback_names": ["du_lieu_diem_thi_2022.csv", "diem_thi_thpt_2022.csv"],
    },
    {
        "name": "du_lieu_diem_thi_2023.txt",
        "year": 2023,
        "program": "2006",
        "kind": "csv",
        "fallback_names": ["du_lieu_diem_thi_2023.csv", "diem_thi_thpt_2023.csv"],
    },
    {
        "name": "du_lieu_diem_thi_2024.txt",
        "year": 2024,
        "program": "2006",
        "kind": "csv",
        "fallback_names": ["du_lieu_diem_thi_2024.csv", "diem_thi_thpt_2024.csv"],
    },
    {
        "name": "du-lieu-diem-thi-2025-ct2006.txt",
        "year": 2025,
        "program": "2006",
        "kind": "csv",
        "fallback_specs": [
            {"name": "du-lieu-diem-thi-2025-ct2006.csv", "kind": "csv"},
            {"name": "20250715-ketquathi-ct2006.xlsx", "kind": "xlsx", "sheet": "Sheet1"},
        ],
    },
    {
        "name": "du-lieu-diem-thi-2025-ct2018.txt",
        "year": 2025,
        "program": "2018",
        "kind": "csv",
        "fallback_specs": [
            {"name": "du-lieu-diem-thi-2025-ct2018.csv", "kind": "csv"},
            {"name": "20250715-ketquathi-ct2018a.xlsx", "kind": "xlsx", "sheet": "Sheet1"},
            {"name": "20250715-ketquathi-ct2018a_2.xlsx", "kind": "xlsx", "sheet": "Sheet2"},
        ],
    },
]

PREFERRED_2026_FILE = "du_lieu_diem_thi_2026.txt"
ALTERNATE_2026_FILES = ["du_lieu_diem_thi_2026.csv", "diem_thi_THPTQG_2026.csv", "diem_thi_thpt_2026.csv"]
DROP_SOURCE_COLUMNS = [
    "STT",
    "Công nghệ",
    "nam_source",
    "sbd_source",
    "TongDiem",
    "KhoiA",
    "KhoiA1",
    "KhoiB",
    "KhoiC",
    "KhoiD",
    "KHTN",
    "KHXH",
    "KhoiA02",
    "KhoiC01",
    "KhoiD07",
    "TongDiemKHTN",
    "TongDiemKHXH",
]


def load_processed_data(path: str | Path = "data/processed/final_data.csv") -> pd.DataFrame:
    """Load the processed exam dataset from CSV."""
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Processed data file not found: {csv_path}. "
            "Run the data pipeline or place final_data.csv in data/processed/."
        )
    return pd.read_csv(csv_path)


def normalize_column_name(column: object) -> str:
    """Return the canonical raw-data column name used by the pipeline."""
    name = unicodedata.normalize("NFC", str(column).strip())
    return COLUMN_ALIASES.get(name, name)


def normalize_initial_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize source-specific raw columns before cross-year concatenation."""
    df = df.rename(columns={column: normalize_column_name(column) for column in df.columns})
    return df.drop(columns=[col for col in DROP_SOURCE_COLUMNS if col in df.columns])


def read_csv_source(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[])


def read_excel_source(path: Path, sheet_name: str | int = 0) -> pd.DataFrame:
    return pd.read_excel(path, sheet_name=sheet_name, dtype=str)


def read_raw_source(path: Path, spec: dict[str, Any]) -> tuple[pd.DataFrame, list[str]]:
    """Read one raw source and attach year/program metadata."""
    if spec["kind"] == "csv":
        df = read_csv_source(path)
    else:
        df = read_excel_source(path, spec.get("sheet", 0))

    original_columns = [str(col) for col in df.columns]
    df = normalize_initial_columns(df)
    df["nam"] = spec["year"]
    df["chuong_trinh"] = spec["program"]

    if "ma_ngoai_ngu" not in df.columns:
        df["ma_ngoai_ngu"] = "NA"

    return df, original_columns


def spec_candidates(spec: dict[str, Any]) -> list[dict[str, Any]]:
    candidates = [{k: v for k, v in spec.items() if k not in {"fallback_names", "fallback_specs"}}]
    candidates.extend({**spec, "name": name} for name in spec.get("fallback_names", []))
    candidates.extend({**spec, **fallback} for fallback in spec.get("fallback_specs", []))
    return [{k: v for k, v in candidate.items() if k not in {"fallback_names", "fallback_specs"}} for candidate in candidates]


def resolve_spec_file(raw_dir: Path, spec: dict[str, Any]) -> tuple[Path | None, dict[str, Any]]:
    for candidate in spec_candidates(spec):
        path = raw_dir / candidate["name"]
        if path.exists():
            return path, candidate
    return None, spec_candidates(spec)[0]


def resolve_2026_file(raw_dir: Path) -> tuple[Path | None, dict[str, Any], list[str]]:
    """Pick the supported 2026 filename, preferring the new GitHub txt export."""
    names = [PREFERRED_2026_FILE, *ALTERNATE_2026_FILES]
    found = [raw_dir / name for name in names if (raw_dir / name).exists()]
    warnings: list[str] = []
    if len(found) > 1:
        ignored = ", ".join(path.name for path in found[1:])
        warnings.append(f"Multiple 2026 raw files were found; using {found[0].name} and ignoring {ignored}.")
    spec = {"year": 2026, "program": "2018", "kind": "csv"}
    return (found[0] if found else None), spec, warnings


def discover_raw_files(raw_dir: Path) -> dict[str, Any]:
    """Return found/missing raw file metadata without reading file contents."""
    files: list[dict[str, Any]] = []
    for spec in RAW_SPECS:
        path, resolved = resolve_spec_file(raw_dir, spec)
        files.append({**resolved, "path": path, "status": "found" if path else "missing"})

    path_2026, spec_2026, warnings = resolve_2026_file(raw_dir)
    files.append(
        {
            **spec_2026,
            "name": path_2026.name if path_2026 else "2026 CSV/TXT",
            "path": path_2026,
            "status": "found" if path_2026 else "missing",
        }
    )
    return {"files": files, "warnings": warnings}


def source_has_language_code(original_columns: list[str]) -> bool:
    return "ma_ngoai_ngu" in [normalize_column_name(col) for col in original_columns]


def read_raw_sources(raw_dir: Path) -> tuple[list[pd.DataFrame], dict[str, Any]]:
    """Read available raw score files and return dataframes plus loading metadata."""
    frames: list[pd.DataFrame] = []
    metadata: dict[str, Any] = {"files": [], "warnings": [], "english_assumption_years": set()}

    for spec in RAW_SPECS:
        path, resolved = resolve_spec_file(raw_dir, spec)
        if path is None:
            metadata["files"].append({"file": spec["name"], "status": "missing"})
            continue

        df, original_columns = read_raw_source(path, resolved)
        if not source_has_language_code(original_columns):
            metadata["english_assumption_years"].add(resolved["year"])
        frames.append(df)
        metadata["files"].append(
            {
                "file": path.name,
                "status": "used",
                "rows": len(df),
                "year": resolved["year"],
                "program": resolved["program"],
                "columns": original_columns,
            }
        )

    path_2026, spec_2026, warnings = resolve_2026_file(raw_dir)
    metadata["warnings"].extend(warnings)
    if path_2026 is None:
        metadata["files"].append({"file": "2026 CSV/TXT", "status": "missing"})
    else:
        df_2026, original_columns = read_raw_source(path_2026, spec_2026)
        for missing_col in ["gdcd", "cong_nghe_cn", "cong_nghe_nn"]:
            if missing_col not in df_2026.columns:
                df_2026[missing_col] = np.nan
        if not source_has_language_code(original_columns):
            metadata["english_assumption_years"].add(2026)
        frames.append(df_2026)
        metadata["files"].append(
            {
                "file": path_2026.name,
                "status": "used",
                "rows": len(df_2026),
                "year": 2026,
                "program": "2018",
                "columns": original_columns,
            }
        )

    if not frames:
        raise FileNotFoundError(f"No valid raw input files found in {raw_dir}")

    metadata["english_assumption_years"] = sorted(metadata["english_assumption_years"])
    return frames, metadata
