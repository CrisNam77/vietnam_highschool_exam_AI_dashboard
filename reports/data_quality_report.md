# Data Quality Report

## Dataset Source

The processed dataset combines Vietnam high school graduation exam score files from 2022 to 2026. Inputs include CSV files for 2022, 2023, 2024, and 2026, plus XLSX files for the 2025 CT2006 and CT2018 cohorts.

The generated output is `data/processed/final_data.csv` in wide format, with one candidate per row. The full CSV is intentionally ignored by git because it is large.

## Processing Pipeline

The preprocessing pipeline:

- Discovers expected raw files and supports both 2026 filenames: `diem_thi_THPTQG_2026.csv` and `diem_thi_thpt_2026.csv`.
- Normalizes SBD and subject-score column names across CSV/XLSX sources.
- Cleans SBD values, score values, and language-code values.
- Maps `ma_tinh` from the original SBD prefix to post-merger `ten_tinh`, `vung_mien`, and `vung_3`.
- Adds derived fields: `so_mon`, `diem_tb`, `ban`, `diem_anh`, and all dashboard-needed combination scores.
- Writes validation details to `data/processed/clean_run_stats.md` and this report.

## Final Output From Last Successful Run

- Path: `data/processed/final_data.csv`
- File size: about 770 MB
- Shape: 5,359,670 rows x 37 columns
- Unique `ten_tinh`: 34
- Unique `vung_mien`: 6
- Unique `vung_3`: 3

## Final Schema

`nam`, `chuong_trinh`, `sbd`, `ma_tinh`, `ten_tinh`, `vung_mien`, `vung_3`, `ma_ngoai_ngu`, `toan`, `ngu_van`, `ngoai_ngu`, `vat_li`, `hoa_hoc`, `sinh_hoc`, `lich_su`, `dia_li`, `gdcd`, `tin_hoc`, `cong_nghe_cn`, `cong_nghe_nn`, `gd_ktpl`, `so_mon`, `diem_tb`, `ban`, `diem_anh`, `diem_khoi_a00`, `diem_khoi_a01`, `diem_khoi_a02`, `diem_khoi_b00`, `diem_khoi_b08`, `diem_khoi_c00`, `diem_khoi_c03`, `diem_khoi_c04`, `diem_khoi_d01`, `diem_khoi_d07`, `diem_khoi_d14`, `diem_khoi_d15`

## Data Quality Checks From Last Successful Run

- Invalid SBD rows removed: 0
- Province mapping failures removed: 0
- Empty-score rows removed: 4,637
- Scores outside [0, 10] set to NaN: 0
- Duplicate `nam`, `chuong_trinh`, `sbd` keys reported, not removed: 0

## Year Distribution

| Year | Rows |
|---|---:|
| 2022 | 995,435 |
| 2023 | 1,017,584 |
| 2024 | 1,061,604 |
| 2025 | 1,153,072 |
| 2026 | 1,131,975 |

## Program Distribution

| Year | Program | Rows |
|---|---|---:|
| 2022 | 2006 | 995,435 |
| 2023 | 2006 | 1,017,584 |
| 2024 | 2006 | 1,061,604 |
| 2025 | 2006 | 22,088 |
| 2025 | 2018 | 1,130,984 |
| 2026 | 2018 | 1,131,975 |

## Assumptions

- Post-merger province/city mapping is intentional for this project version.
- `ma_tinh` remains the original first two digits of SBD.
- Missing subject scores remain NaN and are not filled.
- `diem_tb` is the average of all available subject scores, skipping NaN.
- For years without `ma_ngoai_ngu`, currently 2022 and 2026, `ngoai_ngu` is temporarily treated as `diem_anh`.
- Combination scores remain NaN if any component score is missing.
- Duplicate keys are reported but not automatically removed.

## Course Requirement Fit

- Real Vietnam-related data: yes.
- More than 2,000 rows: yes.
- At least 7 meaningful variables: yes.
- Suitable for dashboard analysis: yes.
- Suitable for AI Assistant read-only analysis over local processed data: yes.

## Limitations

- Historical province names are not stored as separate columns.
- CT2006 and CT2018 rows are not fully comparable without program-aware filtering.
- The temporary English-score assumption should be revisited if official language-code data becomes available.
- `final_data.csv` is too large for git; commit code, reports, or a small sample instead of the full processed dataset.
