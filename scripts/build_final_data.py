"""Build the processed wide exam dataset from raw score files."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.clean_data import clean_exam_data
from src.feature_engineering import add_features, select_final_columns
from src.load_data import read_raw_sources
from src.metrics import build_clean_run_report, build_data_quality_report, build_validation_summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build data/processed/final_data.csv from raw exam files.")
    parser.add_argument("--raw", type=Path, default=Path("data/raw"), help="Raw data directory.")
    parser.add_argument("--out", type=Path, default=Path("data/processed"), help="Processed output directory.")
    return parser.parse_args()


def print_raw_file_status(raw_metadata: dict) -> None:
    for item in raw_metadata.get("files", []):
        if item.get("status") == "used":
            print(f"[found] {item['file']}: {item['rows']} rows")
        else:
            print(f"[missing] {item.get('file')}")
    for warning in raw_metadata.get("warnings", []):
        print(f"[warning] {warning}")


def build_final_data(raw_dir: Path, out_dir: Path) -> pd.DataFrame:
    out_dir.mkdir(parents=True, exist_ok=True)
    reports_dir = ROOT / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    output_path = out_dir / "final_data.csv"
    stats_path = out_dir / "clean_run_stats.md"
    quality_report_path = reports_dir / "data_quality_report.md"

    print(f"Reading raw data from {raw_dir}")
    print(f"Will write final dataset to {output_path}")
    print(f"Will write processing report to {stats_path}")
    print(f"Will write quality report to {quality_report_path}")
    frames, raw_metadata = read_raw_sources(raw_dir)
    print_raw_file_status(raw_metadata)

    raw_df = pd.concat(frames, ignore_index=True)
    cleaned_df, clean_stats = clean_exam_data(raw_df)
    featured_df = add_features(cleaned_df)
    clean_stats["duplicate_key_count"] = int(
        featured_df.duplicated(subset=["nam", "chuong_trinh", "sbd"], keep=False).sum()
    )
    final_df = select_final_columns(featured_df)

    final_df.to_csv(output_path, index=False, float_format="%.2f")

    summary = build_validation_summary(
        final_df,
        {
            "output_path": output_path,
            "raw_metadata": raw_metadata,
            "clean_stats": clean_stats,
        },
    )
    stats_path.write_text(build_clean_run_report(summary), encoding="utf-8")
    quality_report_path.write_text(build_data_quality_report(summary), encoding="utf-8")

    rows, cols = summary["shape"]
    print("\nCompleted final data preprocessing.")
    print(f"- final_data.csv: {output_path}")
    print(f"- clean_run_stats.md: {stats_path}")
    print(f"- data_quality_report.md: {quality_report_path}")
    print(f"- Shape: {rows} rows x {cols} columns")
    return final_df


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
