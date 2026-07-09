import json
import logging
import math
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# Fixed metadata
YEARS = [2022, 2023, 2024, 2025, 2026]
SUBJECTS = [
    {"id": "toan", "name": "Toán"},
    {"id": "ngu_van", "name": "Ngữ văn"},
    {"id": "tieng_anh", "name": "Tiếng Anh"},
    {"id": "vat_li", "name": "Vật lý"},
    {"id": "hoa_hoc", "name": "Hóa học"},
    {"id": "sinh_hoc", "name": "Sinh học"},
    {"id": "lich_su", "name": "Lịch sử"},
    {"id": "dia_li", "name": "Địa lý"},
    {"id": "gdcd", "name": "GDCD"},
]
SUBJECT_IDS = [s["id"] for s in SUBJECTS]
REGIONS = [
    {"id": "dbsh", "name": "ĐB sông Hồng"},
    {"id": "dnb", "name": "Đông Nam Bộ"},
    {"id": "btb", "name": "Bắc Trung Bộ"},
    {"id": "dhntb", "name": "DH Nam Trung Bộ"},
    {"id": "dbscl", "name": "ĐB sông Cửu Long"},
    {"id": "tn", "name": "Tây Nguyên"},
    {"id": "tdmnpb", "name": "TD & MN phía Bắc"},
]
PROGRAMS = ["CT2006", "CT2018"]
COMBINATIONS = [
    {"id": "a00", "name": "A00", "subjects": "Toán, Vật lý, Hóa học"},
    {"id": "a01", "name": "A01", "subjects": "Toán, Vật lý, Tiếng Anh"},
    {"id": "a02", "name": "A02", "subjects": "Toán, Vật lý, Sinh học"},
    {"id": "b00", "name": "B00", "subjects": "Toán, Hóa học, Sinh học"},
    {"id": "b08", "name": "B08", "subjects": "Toán, Sinh học, Tiếng Anh"},
    {"id": "c00", "name": "C00", "subjects": "Ngữ văn, Lịch sử, Địa lý"},
    {"id": "c03", "name": "C03", "subjects": "Ngữ văn, Toán, Lịch sử"},
    {"id": "c04", "name": "C04", "subjects": "Ngữ văn, Toán, Địa lý"},
    {"id": "d01", "name": "D01", "subjects": "Toán, Ngữ văn, Tiếng Anh"},
    {"id": "d07", "name": "D07", "subjects": "Toán, Hóa học, Tiếng Anh"},
    {"id": "d14", "name": "D14", "subjects": "Ngữ văn, Lịch sử, Tiếng Anh"},
    {"id": "d15", "name": "D15", "subjects": "Ngữ văn, Địa lý, Tiếng Anh"},
]
COMBO_IDS = [c["id"] for c in COMBINATIONS]

def clean_float(val):
    if pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return float(val)

def generate_bins(score_series, min_score, max_score, step):
    counts, edges = np.histogram(score_series.dropna(), bins=np.arange(min_score, max_score + step + step/2, step))
    total = counts.sum()
    bins = []
    for i in range(len(counts)):
        start = float(edges[i])
        end = float(edges[i+1])
        c = int(counts[i])
        bins.append({
            "start": round(start, 2),
            "end": round(end, 2),
            "label": f"{start:.2f}-{end:.2f}",
            "percentage": round(c / total * 100, 2) if total > 0 else 0,
            "count": c
        })
    return bins

def mad(series):
    median = series.median()
    return (series - median).abs().mean()

def main():
    data_path = Path("data/processed/final_data.csv")
    out_path = Path("frontend/src/data/dashboardMockData.ts")
    
    if not data_path.exists():
        logging.error(f"Cannot find {data_path}. Please run clean_data.py first.")
        return

    logging.info(f"Loading data from {data_path}...")
    df = pd.read_csv(data_path)

    # Alias diem_anh to tieng_anh for processing since SUBJECTS has tieng_anh
    if "tieng_anh" not in df.columns and "diem_anh" in df.columns:
        df["tieng_anh"] = df["diem_anh"]

    logging.info("Calculating KPIs...")
    total_candidates = len(df)
    total_provinces = df["ten_tinh"].nunique()
    
    # nationalAverageByYear
    nat_avg_yr = []
    candidates_yr = []
    
    for y in YEARS:
        df_y = df[df["nam"] == y]
        candidates_yr.append({"year": y, "value": int(len(df_y))})
        # overall avg is mean of all subject means for that year
        subj_means = [df_y[sid].mean() for sid in SUBJECT_IDS if sid in df_y.columns]
        val = np.nanmean(subj_means) if subj_means else 0
        nat_avg_yr.append({"year": y, "value": round(float(val), 2)})
        
    overall_avg = np.mean([item["value"] for item in nat_avg_yr])

    overviewKpis = [
        {"label": "Tổng số thí sinh", "value": f"{total_candidates/1000000:.2f} triệu"},
        {"label": "Số tỉnh/thành", "value": str(total_provinces)},
        {"label": "Giai đoạn", "value": f"{min(YEARS)}-{max(YEARS)}"},
        {"label": "Điểm TB toàn quốc", "value": f"{overall_avg:.2f}"},
    ]

    logging.info("Calculating subject stats...")
    subjectAverages = []
    for s in SUBJECTS:
        sid = s["id"]
        if sid in df.columns:
            val = df[sid].mean()
            subjectAverages.append({"subjectId": sid, "subjectName": s["name"], "value": round(float(val), 2) if pd.notna(val) else 0})

    subjectYearMatrix = []
    for y in YEARS:
        df_y = df[df["nam"] == y]
        for s in SUBJECTS:
            sid = s["id"]
            if sid in df_y.columns:
                series = df_y[sid].dropna()
                if len(series) == 0:
                    continue
                avg = series.mean()
                under5 = (series < 5).mean() * 100
                eight_plus = (series >= 8).mean() * 100
                perfect10 = int((series == 10).sum())
                subjectYearMatrix.append({
                    "subjectId": sid,
                    "subjectName": s["name"],
                    "year": y,
                    "average": round(float(avg), 2),
                    "underFive": round(float(under5), 1),
                    "eightPlus": round(float(eight_plus), 1),
                    "perfect10": perfect10
                })

    underFiveRates = []
    eightPlusRates = []
    for s in SUBJECTS:
        sid = s["id"]
        latest = [row for row in subjectYearMatrix if row["subjectId"] == sid and row["year"] == max(YEARS)]
        if latest:
            underFiveRates.append({"subjectId": sid, "subjectName": s["name"], "value": latest[0]["underFive"]})
            eightPlusRates.append({"subjectId": sid, "subjectName": s["name"], "value": latest[0]["eightPlus"]})

    logging.info("Calculating province and region stats...")
    provinceRankings = []
    regionAverages = []
    
    for y in YEARS:
        df_y = df[df["nam"] == y]
        for s in SUBJECTS:
            sid = s["id"]
            if sid in df_y.columns:
                # Province
                grp = df_y.groupby(["ten_tinh", "vung_mien"])[sid].agg(["mean", "count"]).reset_index()
                for _, row in grp.iterrows():
                    if pd.notna(row["mean"]):
                        provinceRankings.append({
                            "province": str(row["ten_tinh"]),
                            "regionId": "unknown", # Will map below
                            "regionName": str(row["vung_mien"]),
                            "year": y,
                            "subjectId": sid,
                            "subjectName": s["name"],
                            "average": round(float(row["mean"]), 2),
                            "candidates": int(row["count"])
                        })
                
                # Region
                grp_reg = df_y.groupby("vung_mien")[sid].mean().reset_index()
                for _, row in grp_reg.iterrows():
                    if pd.notna(row[sid]):
                        regionAverages.append({
                            "regionId": "unknown",
                            "regionName": str(row["vung_mien"]),
                            "year": y,
                            "subjectId": sid,
                            "subjectName": s["name"],
                            "average": round(float(row[sid]), 2)
                        })

    # Map region names to IDs
    name_to_id = {r["name"]: r["id"] for r in REGIONS}
    for item in provinceRankings:
        item["regionId"] = name_to_id.get(item["regionName"], "other")
    for item in regionAverages:
        item["regionId"] = name_to_id.get(item["regionName"], "other")

    regionSubjectMatrix = [item for item in regionAverages if item["year"] == max(YEARS)]

    logging.info("Calculating distributions and detailed stats...")
    subjectDistributions = []
    combinationDistributions = []
    distributionStats = []

    for y in YEARS:
        df_y = df[df["nam"] == y]
        
        # Subjects
        for s in SUBJECTS:
            sid = s["id"]
            if sid in df_y.columns:
                series = df_y[sid].dropna()
                if len(series) == 0:
                    continue
                bins = generate_bins(series, 0, 10, 0.25)
                subjectDistributions.append({
                    "year": y,
                    "type": "subject",
                    "key": sid,
                    "name": s["name"],
                    "scoreMin": 0,
                    "scoreMax": 10,
                    "binSize": 0.25,
                    "bins": bins
                })
                
                distributionStats.append({
                    "year": y,
                    "type": "subject",
                    "key": sid,
                    "name": s["name"],
                    "candidateCount": int(len(series)),
                    "mean": clean_float(series.mean()) or 0,
                    "median": clean_float(series.median()) or 0,
                    "std": clean_float(series.std()) or 0,
                    "mad": clean_float(mad(series)) or 0,
                    "mode": clean_float(series.mode().iloc[0] if not series.mode().empty else 0) or 0,
                    "underFiveCount": int((series < 5).sum()),
                    "underFiveRate": round(float((series < 5).mean() * 100), 1),
                    "eightPlusCount": int((series >= 8).sum()),
                    "eightPlusRate": round(float((series >= 8).mean() * 100), 1),
                    "perfectCount": int((series == 10).sum()),
                    "zeroCount": int((series == 0).sum()),
                    "belowOneCount": int((series <= 1).sum()),
                    "belowOneRate": round(float((series <= 1).mean() * 100), 2)
                })

        # Combinations
        for c in COMBINATIONS:
            cid = c["id"]
            col_name = f"diem_khoi_{cid}"
            if col_name in df_y.columns:
                series = df_y[col_name].dropna()
                if len(series) == 0:
                    continue
                bins = generate_bins(series, 0, 30, 0.25)
                combinationDistributions.append({
                    "year": y,
                    "type": "combination",
                    "key": cid,
                    "name": c["name"],
                    "scoreMin": 0,
                    "scoreMax": 30,
                    "binSize": 0.25,
                    "bins": bins
                })
                
                distributionStats.append({
                    "year": y,
                    "type": "combination",
                    "key": cid,
                    "name": c["name"],
                    "candidateCount": int(len(series)),
                    "mean": clean_float(series.mean()) or 0,
                    "median": clean_float(series.median()) or 0,
                    "std": clean_float(series.std()) or 0,
                    "mad": clean_float(mad(series)) or 0,
                    "mode": clean_float(series.mode().iloc[0] if not series.mode().empty else 0) or 0,
                    "underFifteenCount": int((series < 15).sum()),
                    "underFifteenRate": round(float((series < 15).mean() * 100), 1),
                    "aboveTwentyFourCount": int((series >= 24).sum()),
                    "aboveTwentyFourRate": round(float((series >= 24).mean() * 100), 1),
                    "aboveTwentySevenCount": int((series >= 27).sum()),
                    "aboveTwentySevenRate": round(float((series >= 27).mean() * 100), 1),
                    "maxScoreCount": int((series == 30).sum()),
                })

    logging.info("Writing TS file...")
    
    # We serialize arrays to JSON and assign to exports
    def j(obj):
        return json.dumps(obj, ensure_ascii=False, indent=2)

    ts_content = f"""import type {{
  KpiItem,
  CombinationOption,
  DistributionRecord,
  DistributionStats,
  ProvinceRanking,
  Region,
  RegionMetric,
  Subject,
  SubjectMetric,
  SubjectYearMetric,
  YearMetric,
}} from '@/types/dashboard';

// AUTO-GENERATED from final_data.csv via scripts/generate_dashboard_json.py
// Do not edit manually.

export const YEARS = {j(YEARS)} as const;
export const SUBJECTS: Subject[] = {j(SUBJECTS)};
export const REGIONS: Region[] = {j(REGIONS)};
export const PROGRAMS = {j(PROGRAMS)} as const;
export const COMBINATIONS: CombinationOption[] = {j(COMBINATIONS)};

export const overviewKpis: KpiItem[] = {j(overviewKpis)};
export const nationalAverageByYear: YearMetric[] = {j(nat_avg_yr)};
export const candidatesByYear: YearMetric[] = {j(candidates_yr)};
export const subjectAverages: SubjectMetric[] = {j(subjectAverages)};
export const subjectYearMatrix: SubjectYearMetric[] = {j(subjectYearMatrix)};
export const underFiveRates: SubjectMetric[] = {j(underFiveRates)};
export const eightPlusRates: SubjectMetric[] = {j(eightPlusRates)};
export const provinceRankings: ProvinceRanking[] = {j(provinceRankings)};
export const regionAverages: RegionMetric[] = {j(regionAverages)};
export const regionSubjectMatrix = {j(regionSubjectMatrix)};

export const subjectDistributions: DistributionRecord[] = {j(subjectDistributions)};
export const combinationDistributions: DistributionRecord[] = {j(combinationDistributions)};
export const distributionStats: DistributionStats[] = {j(distributionStats)};
"""

    out_path.write_text(ts_content, encoding="utf-8")
    logging.info(f"Successfully generated {out_path} ({len(ts_content)} bytes)")

if __name__ == "__main__":
    main()
