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
    "Toán": "toan",
    "toan": "toan",
    "Văn": "ngu_van",
    "ngu_van": "ngu_van",
    "Ngoại ngữ": "ngoai_ngu",
    "ngoai_ngu": "ngoai_ngu",
    "Lí": "vat_li",
    "Lý": "vat_li",
    "vat_li": "vat_li",
    "Hóa": "hoa_hoc",
    "hoa_hoc": "hoa_hoc",
    "Sinh": "sinh_hoc",
    "sinh_hoc": "sinh_hoc",
    "Sử": "lich_su",
    "lich_su": "lich_su",
    "Địa": "dia_li",
    "dia_li": "dia_li",
    "Giáo dục công dân": "gdcd",
    "gdcd": "gdcd",
    "Tin học": "tin_hoc",
    "tin_hoc": "tin_hoc",
    "Công nghệ công nghiệp": "cong_nghe_cn",
    "cong_nghe_cn": "cong_nghe_cn",
    "Công nghệ nông nghiệp": "cong_nghe_nn",
    "cong_nghe_nn": "cong_nghe_nn",
    "Giáo dục kinh tế và pháp luật": "gd_ktpl",
    "GD Kinh tế - Pháp luật": "gd_ktpl",
    "gd_ktpl": "gd_ktpl",
    "Mã môn ngoại ngữ": "ma_ngoai_ngu",
    "ma_ngoai_ngu": "ma_ngoai_ngu",
}

RAW_SPECS = [
    {"name": "diem_thi_thpt_2022.csv", "year": 2022, "program": "2006", "kind": "csv"},
    {"name": "diem_thi_thpt_2023.csv", "year": 2023, "program": "2006", "kind": "csv"},
    {"name": "diem_thi_thpt_2024.csv", "year": 2024, "program": "2006", "kind": "csv"},
    {
        "name": "20250715-ketquathi-ct2006.xlsx",
        "year": 2025,
        "program": "2006",
        "kind": "xlsx",
        "sheet": "Sheet1",
    },
    {
        "name": "20250715-ketquathi-ct2018a.xlsx",
        "year": 2025,
        "program": "2018",
        "kind": "xlsx",
        "sheet": "Sheet1",
    },
    {
        "name": "20250715-ketquathi-ct2018a_2.xlsx",
        "year": 2025,
        "program": "2018",
        "kind": "xlsx",
        "sheet": "Sheet2",
    },
]

PREFERRED_2026_FILE = "diem_thi_THPTQG_2026.csv"
ALTERNATE_2026_FILE = "diem_thi_thpt_2026.csv"


def load_processed_data(path: str | Path = "data/processed/final_data.csv") -> pd.DataFrame:
    """Load the processed exam dataset from CSV.

    The function does not download or generate data. It raises a clear error if the expected
    processed file is missing.
    """
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
    return df.drop(columns=[col for col in ["STT", "Công nghệ"] if col in df.columns])


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


def resolve_2026_file(raw_dir: Path) -> tuple[Path | None, list[str]]:
    """Pick the supported 2026 filename, preferring the THPTQG name."""
    preferred = raw_dir / PREFERRED_2026_FILE
    alternate = raw_dir / ALTERNATE_2026_FILE
    warnings: list[str] = []

    if preferred.exists() and alternate.exists():
        warnings.append(
            f"Both 2026 filenames were found; using {PREFERRED_2026_FILE} "
            f"and ignoring {ALTERNATE_2026_FILE}."
        )
        return preferred, warnings
    if preferred.exists():
        return preferred, warnings
    if alternate.exists():
        return alternate, warnings
    return None, warnings


def discover_raw_files(raw_dir: Path) -> dict[str, Any]:
    """Return found/missing raw file metadata without reading file contents."""
    files: list[dict[str, Any]] = []
    for spec in RAW_SPECS:
        path = raw_dir / spec["name"]
        files.append({**spec, "path": path, "status": "found" if path.exists() else "missing"})

    path_2026, warnings = resolve_2026_file(raw_dir)
    files.append(
        {
            "name": path_2026.name if path_2026 else "2026 CSV",
            "path": path_2026,
            "year": 2026,
            "program": "2018",
            "kind": "csv",
            "status": "found" if path_2026 else "missing",
        }
    )
    return {"files": files, "warnings": warnings}


def read_raw_sources(raw_dir: Path) -> tuple[list[pd.DataFrame], dict[str, Any]]:
    """Read available raw score files and return dataframes plus loading metadata."""
    frames: list[pd.DataFrame] = []
    metadata: dict[str, Any] = {"files": [], "warnings": [], "english_assumption_years": set()}

    for spec in RAW_SPECS:
        path = raw_dir / spec["name"]
        if not path.exists():
            metadata["files"].append({"file": spec["name"], "status": "missing"})
            continue

        df, original_columns = read_raw_source(path, spec)
        if "ma_ngoai_ngu" not in [normalize_column_name(col) for col in original_columns]:
            metadata["english_assumption_years"].add(spec["year"])
        frames.append(df)
        metadata["files"].append(
            {
                "file": path.name,
                "status": "used",
                "rows": len(df),
                "year": spec["year"],
                "program": spec["program"],
                "columns": original_columns,
            }
        )

    path_2026, warnings = resolve_2026_file(raw_dir)
    metadata["warnings"].extend(warnings)
    if path_2026 is None:
        metadata["files"].append({"file": "2026 CSV", "status": "missing"})
    else:
        spec_2026 = {"year": 2026, "program": "2018", "kind": "csv"}
        df_2026, original_columns = read_raw_source(path_2026, spec_2026)
        df_2026["cong_nghe_cn"] = np.nan
        df_2026["cong_nghe_nn"] = np.nan
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
