"""Build the processed wide exam dataset from raw score files."""

from __future__ import annotations

import argparse
import sys
import unicodedata
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.clean_data import OLD_TO_NEW, PROVINCE_NEW, REGION3_OF_6, norm_tinh

SCORE_COLS = [
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

FINAL_COLS = [
    "nam",
    "chuong_trinh",
    "sbd",
    "ma_tinh",
    "ten_tinh",
    "vung_mien",
    "vung_3",
    "ma_ngoai_ngu",
    *SCORE_COLS,
    "so_mon",
    "diem_tb",
    "ban",
    "diem_anh",
    *COMBINATION_COLS,
]

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


def normalize_column_name(column: object) -> str:
    name = unicodedata.normalize("NFC", str(column).strip())
    return COLUMN_ALIASES.get(name, name)


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns={column: normalize_column_name(column) for column in df.columns})
    return df.drop(columns=[col for col in ["STT", "Công nghệ"] if col in df.columns])


def read_raw_file(path: Path, spec: dict[str, Any]) -> tuple[pd.DataFrame, list[str]]:
    if spec["kind"] == "csv":
        df = pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[])
    else:
        df = pd.read_excel(path, sheet_name=spec.get("sheet", 0), dtype=str)

    original_columns = [str(col) for col in df.columns]
    df = normalize_columns(df)
    df["nam"] = spec["year"]
    df["chuong_trinh"] = spec["program"]

    if "ma_ngoai_ngu" not in df.columns:
        df["ma_ngoai_ngu"] = "NA"

    return df, original_columns


def resolve_2026_file(raw_dir: Path) -> tuple[Path | None, list[str]]:
    preferred = raw_dir / "diem_thi_THPTQG_2026.csv"
    alternate = raw_dir / "diem_thi_thpt_2026.csv"
    warnings: list[str] = []

    if preferred.exists() and alternate.exists():
        warnings.append(
            "Both 2026 filenames were found; using diem_thi_THPTQG_2026.csv and ignoring diem_thi_thpt_2026.csv."
        )
        return preferred, warnings
    if preferred.exists():
        return preferred, warnings
    if alternate.exists():
        return alternate, warnings
    return None, warnings


def load_raw_data(raw_dir: Path) -> tuple[pd.DataFrame, dict[str, Any]]:
    frames: list[pd.DataFrame] = []
    report: dict[str, Any] = {"files": [], "warnings": [], "english_assumption_years": set()}

    for spec in RAW_SPECS:
        path = raw_dir / spec["name"]
        if not path.exists():
            message = f"[missing] {spec['name']}"
            print(message)
            report["files"].append({"file": spec["name"], "status": "missing"})
            continue

        df, original_columns = read_raw_file(path, spec)
        if "ma_ngoai_ngu" not in [normalize_column_name(col) for col in original_columns]:
            report["english_assumption_years"].add(spec["year"])
        frames.append(df)
        print(f"[found] {path.name}: {len(df)} rows")
        report["files"].append(
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
    report["warnings"].extend(warnings)
    for warning in warnings:
        print(f"[warning] {warning}")

    if path_2026 is None:
        print("[missing] diem_thi_THPTQG_2026.csv / diem_thi_thpt_2026.csv")
        report["files"].append({"file": "2026 CSV", "status": "missing"})
    else:
        spec_2026 = {"year": 2026, "program": "2018", "kind": "csv"}
        df_2026, original_columns = read_raw_file(path_2026, spec_2026)
        df_2026["cong_nghe_cn"] = np.nan
        df_2026["cong_nghe_nn"] = np.nan
        report["english_assumption_years"].add(2026)
        frames.append(df_2026)
        print(f"[found] {path_2026.name}: {len(df_2026)} rows")
        report["files"].append(
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

    report["english_assumption_years"] = sorted(report["english_assumption_years"])
    return pd.concat(frames, ignore_index=True), report


def clean_and_derive(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    stats: dict[str, Any] = {"raw_rows": len(df)}

    if "sbd" not in df.columns:
        raise ValueError("No SBD column found after column normalization.")

    df["sbd"] = df["sbd"].fillna("").astype(str)
    df["sbd"] = df["sbd"].str.replace(r"\.0$", "", regex=True)
    df["sbd"] = df["sbd"].str.replace(r"\D", "", regex=True)
    df["sbd"] = df["sbd"].str.zfill(8)

    invalid_sbd_mask = df["sbd"].str.len() != 8
    stats["dropped_invalid_sbd"] = int(invalid_sbd_mask.sum())
    df = df[~invalid_sbd_mask].copy()

    df["ma_tinh"] = df["sbd"].str[:2]
    df["ten_tinh"] = pd.Series(pd.NA, index=df.index, dtype=object)

    cond_old = df["nam"] <= 2025
    cond_new = df["nam"] == 2026
    if cond_old.any():
        df.loc[cond_old, "ten_tinh"] = df.loc[cond_old, "ma_tinh"].map(OLD_TO_NEW)

    strange_new_provinces: list[str] = []
    if cond_new.any() and "Tỉnh" in df.columns:
        normed = df.loc[cond_new, "Tỉnh"].apply(norm_tinh)
        valid_mask = normed.isin(PROVINCE_NEW.keys())
        df.loc[cond_new & valid_mask, "ten_tinh"] = normed[valid_mask]
        invalid_mask = cond_new & (~valid_mask) & df["Tỉnh"].notna() & (df["Tỉnh"] != "")
        strange_new_provinces = sorted(df.loc[invalid_mask, "Tỉnh"].dropna().unique().tolist())
    elif cond_new.any():
        df.loc[cond_new, "ten_tinh"] = df.loc[cond_new, "ma_tinh"].map(OLD_TO_NEW)

    df["vung_mien"] = df["ten_tinh"].map(PROVINCE_NEW)
    df["vung_3"] = df["vung_mien"].map(REGION3_OF_6)

    strange_province_mask = df["ten_tinh"].isna()
    stats["dropped_strange_province"] = int(strange_province_mask.sum())
    stats["strange_new_provinces"] = strange_new_provinces
    df = df[~strange_province_mask].copy()

    out_of_bounds_by_col: dict[str, int] = {}
    for col in SCORE_COLS:
        if col not in df.columns:
            df[col] = np.nan
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")
        invalid_score_mask = (df[col] < 0) | (df[col] > 10)
        out_of_bounds_by_col[col] = int(invalid_score_mask.sum())
        df.loc[invalid_score_mask, col] = np.nan

    stats["out_of_bounds_by_col"] = out_of_bounds_by_col
    stats["out_of_bounds_total"] = int(sum(out_of_bounds_by_col.values()))

    df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].astype(str).str.strip().str.upper()
    df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].replace(["", "NAN", "NONE", "<NA>"], "NA")
    df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].fillna("NA")

    df["so_mon"] = df[SCORE_COLS].notna().sum(axis=1)
    df["diem_tb"] = df[SCORE_COLS].mean(axis=1)

    khtn_count = df[["vat_li", "hoa_hoc", "sinh_hoc"]].notna().sum(axis=1)
    khxh_count = df[["lich_su", "dia_li", "gdcd"]].notna().sum(axis=1)
    cond_2006 = df["chuong_trinh"].astype(str) == "2006"
    df["ban"] = pd.Series(np.nan, index=df.index, dtype=object)
    df.loc[cond_2006 & (khtn_count > khxh_count), "ban"] = "KHTN"
    df.loc[cond_2006 & (khxh_count > khtn_count), "ban"] = "KHXH"
    df.loc[cond_2006 & (khtn_count == khxh_count) & (khtn_count > 0), "ban"] = "Khác"

    df["diem_anh"] = np.where(
        (df["ma_ngoai_ngu"] == "N1") | df["nam"].isin([2022, 2026]),
        df["ngoai_ngu"],
        np.nan,
    )

    df["diem_khoi_a00"] = df["toan"] + df["vat_li"] + df["hoa_hoc"]
    df["diem_khoi_a01"] = df["toan"] + df["vat_li"] + df["diem_anh"]
    df["diem_khoi_a02"] = df["toan"] + df["vat_li"] + df["sinh_hoc"]
    df["diem_khoi_b00"] = df["toan"] + df["hoa_hoc"] + df["sinh_hoc"]
    df["diem_khoi_b08"] = df["toan"] + df["sinh_hoc"] + df["diem_anh"]
    df["diem_khoi_c00"] = df["ngu_van"] + df["lich_su"] + df["dia_li"]
    df["diem_khoi_c03"] = df["ngu_van"] + df["toan"] + df["lich_su"]
    df["diem_khoi_c04"] = df["ngu_van"] + df["toan"] + df["dia_li"]
    df["diem_khoi_d01"] = df["toan"] + df["ngu_van"] + df["diem_anh"]
    df["diem_khoi_d07"] = df["toan"] + df["hoa_hoc"] + df["diem_anh"]
    df["diem_khoi_d14"] = df["ngu_van"] + df["lich_su"] + df["diem_anh"]
    df["diem_khoi_d15"] = df["ngu_van"] + df["dia_li"] + df["diem_anh"]

    so_mon_zero_mask = df["so_mon"] == 0
    stats["dropped_so_mon_zero"] = int(so_mon_zero_mask.sum())
    df = df[~so_mon_zero_mask].copy()

    stats["duplicate_key_count"] = int(df.duplicated(subset=["nam", "chuong_trinh", "sbd"], keep=False).sum())
    return df[FINAL_COLS], stats


def markdown_table(df: pd.DataFrame) -> str:
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


def build_report(
    df: pd.DataFrame,
    output_path: Path,
    raw_report: dict[str, Any],
    stats: dict[str, Any],
    first_rows: pd.DataFrame,
) -> str:
    file_size_mb = output_path.stat().st_size / 1024 / 1024 if output_path.exists() else 0
    subject_quality = pd.DataFrame(
        {
            "missing": df[SCORE_COLS].isna().sum(),
            "non_null": df[SCORE_COLS].notna().sum(),
            "min": df[SCORE_COLS].min(),
            "max": df[SCORE_COLS].max(),
            "out_of_bounds_set_nan": pd.Series(stats["out_of_bounds_by_col"]),
        }
    ).reset_index(names="column")

    year_dist = df["nam"].value_counts().sort_index().rename_axis("nam").reset_index(name="rows")
    program_dist = df.groupby(["nam", "chuong_trinh"]).size().reset_index(name="rows")

    checks = {
        "final_data.csv has more than 2,000 rows": len(df) > 2000,
        "final_data.csv has at least 7 meaningful variables": len(df.columns) >= 7,
        "dataset is Vietnam-related": {"ten_tinh", "vung_mien", "sbd"}.issubset(df.columns),
        "all dashboard-needed subject columns exist": set(SCORE_COLS).issubset(df.columns),
        "all dashboard-needed combination columns exist": set(COMBINATION_COLS).issubset(df.columns),
    }

    used_files = [item for item in raw_report["files"] if item.get("status") == "used"]
    missing_files = [item for item in raw_report["files"] if item.get("status") == "missing"]

    lines = [
        "# Data Quality Report",
        "",
        "Generated by `python scripts/build_final_data.py --raw data/raw --out data/processed`.",
        "",
        "## Output",
        f"- Path: `{output_path}`",
        f"- File size: {file_size_mb:.2f} MB",
        f"- Shape: {len(df)} rows x {len(df.columns)} columns",
        f"- Unique `ma_tinh`: {df['ma_tinh'].nunique()}",
        f"- Unique `ten_tinh`: {df['ten_tinh'].nunique()}",
        f"- Unique `vung_mien`: {df['vung_mien'].nunique()}",
        f"- Unique `vung_3`: {df['vung_3'].nunique()}",
        "",
        "## Raw Files Used",
    ]
    for item in used_files:
        lines.append(f"- `{item['file']}`: {item['rows']} rows, year {item['year']}, program {item['program']}")
        lines.append(f"  - Original columns: {', '.join(f'`{col}`' for col in item['columns'])}")
    if missing_files:
        lines.extend(["", "## Missing Raw Files"])
        for item in missing_files:
            lines.append(f"- `{item['file']}`")
    if raw_report["warnings"]:
        lines.extend(["", "## Warnings"])
        lines.extend(f"- {warning}" for warning in raw_report["warnings"])

    lines.extend(
        [
            "",
            "## Final Schema",
            ", ".join(f"`{col}`" for col in df.columns),
            "",
            "## First 5 Rows",
            markdown_table(first_rows),
            "",
            "## Year Distribution",
            markdown_table(year_dist),
            "",
            "## Distribution By Year And Program",
            markdown_table(program_dist),
            "",
            "## Data Quality",
            f"- Rows removed because SBD was invalid: {stats['dropped_invalid_sbd']}",
            f"- Rows removed because province mapping failed: {stats['dropped_strange_province']}",
            f"- Rows removed because `so_mon == 0`: {stats['dropped_so_mon_zero']}",
            f"- Scores outside [0, 10] set to NaN: {stats['out_of_bounds_total']}",
            f"- Duplicate `nam`, `chuong_trinh`, `sbd` rows counted, not removed: {stats['duplicate_key_count']}",
            "",
            "### Score Column Quality",
            markdown_table(subject_quality),
            "",
            "## Course Requirement Checks",
        ]
    )
    lines.extend(f"- {'PASS' if passed else 'FAIL'}: {name}" for name, passed in checks.items())

    english_years = ", ".join(str(year) for year in raw_report["english_assumption_years"]) or "none"
    lines.extend(
        [
            "",
            "## Assumptions And Definitions",
            "- Output remains WIDE format: one candidate per row.",
            "- `ma_tinh` is always the first two digits of the original SBD.",
            "- `ten_tinh` is the post-merger province/city name used for this project version.",
            "- The number of unique `ten_tinh` values may be lower than the old province count; this is intentional.",
            f"- For years without `ma_ngoai_ngu` ({english_years}), `ngoai_ngu` is temporarily treated as `diem_anh`.",
            "- Missing subject scores remain NaN and are not filled.",
            "- `diem_tb` is the average of available subject scores across all score columns, skipping NaN.",
            "- Combination scores are sums of their component scores and remain NaN if any component is missing.",
            "",
            "## Known Limitations And Unresolved Ambiguities",
            "- Post-merger province mapping improves cross-year comparison but hides old province boundaries.",
            "- 2025 CT2006 and CT2018 use different curricula and should be compared cautiously.",
            "- English-score assumptions for years without language codes should be revisited if official language-code data becomes available.",
            "- Duplicate keys are reported but not automatically removed.",
            "- `final_data.csv` is large and should normally stay out of git; commit a sample instead if versioned data is needed.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_final_data(raw_dir: Path, out_dir: Path) -> pd.DataFrame:
    out_dir.mkdir(parents=True, exist_ok=True)
    (ROOT / "reports").mkdir(parents=True, exist_ok=True)

    print(f"Reading raw data from {raw_dir}")
    raw_df, raw_report = load_raw_data(raw_dir)
    print(f"Loaded {len(raw_df)} raw rows from available files.")

    final_df, stats = clean_and_derive(raw_df)
    output_path = out_dir / "final_data.csv"
    final_df.to_csv(output_path, index=False, float_format="%.2f")

    first_rows = final_df.head()
    report_md = build_report(final_df, output_path, raw_report, stats, first_rows)

    stats_path = out_dir / "clean_run_stats.md"
    report_path = ROOT / "reports" / "data_quality_report.md"
    stats_path.write_text(report_md, encoding="utf-8")
    report_path.write_text(report_md, encoding="utf-8")

    print("\nOutput validation")
    print(f"- Output path: {output_path}")
    print(f"- File size MB: {output_path.stat().st_size / 1024 / 1024:.2f}")
    print(f"- Shape: {final_df.shape[0]} rows x {final_df.shape[1]} columns")
    print("- Year distribution:")
    print(final_df["nam"].value_counts().sort_index().to_string())
    print("- Distribution by nam and chuong_trinh:")
    print(final_df.groupby(["nam", "chuong_trinh"]).size().to_string())
    print("- Missing values by score column:")
    print(final_df[SCORE_COLS].isna().sum().to_string())
    print(f"- Duplicate key count: {stats['duplicate_key_count']}")
    if stats["duplicate_key_count"]:
        print("[warning] Duplicate keys exist and were not removed.")
    print(f"- Wrote {stats_path}")
    print(f"- Wrote {report_path}")
    return final_df


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build data/processed/final_data.csv from raw exam files.")
    parser.add_argument("--raw", type=Path, default=Path("data/raw"), help="Raw data directory.")
    parser.add_argument("--out", type=Path, default=Path("data/processed"), help="Processed output directory.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        build_final_data(args.raw, args.out)
    except Exception as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
