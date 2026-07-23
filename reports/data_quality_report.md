# Data Quality Report

## Dataset Source
The dataset combines Vietnam high school graduation exam score files from 2022 to 2026, including CSV and XLSX sources. The generated output is `data/processed/final_data.csv` in wide format.

## Processing Pipeline
The pipeline loads available raw files, normalizes source columns, cleans SBD and score values, maps province/region metadata, adds derived fields, writes the processed CSV, and generates validation reports.

## Final Output
- Path: `data/processed/final_data.csv`
- File size: 898.72 MB
- Shape: 5436558 rows x 44 columns
- Unique `ten_tinh`: 34
- Unique `vung_mien`: 6

## Final Schema
`nam`, `chuong_trinh`, `sbd`, `ma_tinh`, `ten_tinh`, `vung_mien`, `vung_3`, `ma_ngoai_ngu`, `toan`, `ngu_van`, `ngoai_ngu`, `vat_li`, `hoa_hoc`, `sinh_hoc`, `lich_su`, `dia_li`, `gdcd`, `tin_hoc`, `cong_nghe_cn`, `cong_nghe_nn`, `gd_ktpl`, `ten_ngoai_ngu`, `so_mon`, `diem_tb`, `ban`, `diem_anh`, `diem_nga`, `diem_phap`, `diem_trung`, `diem_duc`, `diem_nhat`, `diem_han`, `diem_khoi_a00`, `diem_khoi_a01`, `diem_khoi_a02`, `diem_khoi_b00`, `diem_khoi_b08`, `diem_khoi_c00`, `diem_khoi_c03`, `diem_khoi_c04`, `diem_khoi_d01`, `diem_khoi_d07`, `diem_khoi_d14`, `diem_khoi_d15`

## Quality Checks
- Invalid SBD rows removed: 0
- Province mapping failures removed: 0
- Empty-score rows removed: 4637
- Scores outside [0, 10] set to NaN: 0
- Duplicate keys reported, not removed: 0

## Year Distribution
| nam | rows |
| --- | --- |
| 2022 | 995435 |
| 2023 | 1017584 |
| 2024 | 1061604 |
| 2025 | 1153072 |
| 2026 | 1208863 |

## Program Distribution
| nam | chuong_trinh | rows |
| --- | --- | --- |
| 2022 | 2006 | 995435 |
| 2023 | 2006 | 1017584 |
| 2024 | 2006 | 1061604 |
| 2025 | 2006 | 22088 |
| 2025 | 2018 | 1130984 |
| 2026 | 2018 | 1208863 |

## Course Requirement Fit
- PASS: final_data.csv has more than 2,000 rows
- PASS: final_data.csv has at least 7 meaningful variables
- PASS: dataset is Vietnam-related
- PASS: all dashboard-needed subject columns exist
- PASS: all dashboard-needed combination columns exist

## Assumptions
- Province/city names use the post-merger mapping for this project version.
- Missing subject scores remain NaN.
- `diem_tb` averages all available subject scores.
- `diem_anh` is derived only from rows where `ma_ngoai_ngu == N1`.

## Limitations
- Historical province names are not kept as separate columns.
- CT2006 and CT2018 rows are not fully comparable without program-aware filtering.
- Language-code quality depends on the raw source and should be checked when changing sources.
- `final_data.csv` is large and should remain ignored by git.
