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
    {"id": "dbsh", "name": "Đồng bằng sông Hồng"},
    {"id": "dnb", "name": "Đông Nam Bộ"},
    {"id": "btbtb", "name": "Bắc Trung Bộ & Duyên hải miền Trung"},
    {"id": "dbscl", "name": "Đồng bằng sông Cửu Long"},
    {"id": "tn", "name": "Tây Nguyên"},
    {"id": "tdmnpb", "name": "Trung du & Miền núi phía Bắc"},
]
# Maps exact vung_mien values in CSV -> region ID
CSV_REGION_TO_ID = {
    "Đồng bằng sông Hồng": "dbsh",
    "Đông Nam Bộ": "dnb",
    "Bắc Trung Bộ và Duyên hải miền Trung": "btbtb",
    "Đồng bằng sông Cửu Long": "dbscl",
    "Tây Nguyên": "tn",
    "Trung du và miền núi phía Bắc": "tdmnpb",
}
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
    out_path = Path("frontend/src/data/dashboardData.ts")
    
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
    
    # Map UI program names to the integer codes stored in CSV
    PROGRAM_CODE = {"CT2006": 2006, "CT2018": 2018}

    # candidatesByYear and nationalAverageByYear
    nat_avg_yr = []
    candidates_yr = []
    
    for y in YEARS:
        df_y = df[df["nam"] == y]
        for p in PROGRAMS + ["all"]:
            if p == "all":
                df_yp = df_y
            else:
                df_yp = df_y[df_y["chuong_trinh"] == PROGRAM_CODE[p]]
                
            if len(df_yp) > 0:
                candidates_yr.append({"year": y, "program": p, "value": int(len(df_yp))})
                subj_means = [df_yp[sid].mean() for sid in SUBJECT_IDS if sid in df_yp.columns]
                val = np.nanmean(subj_means) if subj_means else 0
                nat_avg_yr.append({"year": y, "program": p, "value": round(float(val), 2)})
        
    overall_avg = np.mean([item["value"] for item in nat_avg_yr if item.get("program") == "all"])

    overviewKpis = [
        {"label": "Tổng số thí sinh", "value": f"{total_candidates/1000000:.2f} triệu"},
        {"label": "Số tỉnh/thành", "value": str(total_provinces)},
        {"label": "Giai đoạn", "value": f"{min(YEARS)}-{max(YEARS)}"},
        {"label": "Điểm TB toàn quốc", "value": f"{overall_avg:.2f}"},
    ]

    logging.info("Calculating subject stats...")
    subjectAverages = []
    for p in PROGRAMS + ["all"]:
        if p == "all":
            df_p = df
        else:
            df_p = df[df["chuong_trinh"] == PROGRAM_CODE[p]]
            
        if len(df_p) > 0:
            for s in SUBJECTS:
                sid = s["id"]
                if sid in df_p.columns:
                    val = df_p[sid].mean()
                    subjectAverages.append({
                        "subjectId": sid, 
                        "subjectName": s["name"], 
                        "program": p,
                        "value": round(float(val), 2) if pd.notna(val) else 0
                    })

    subjectYearMatrix = []
    for y in YEARS:
        df_y = df[df["nam"] == y]
        for p in PROGRAMS + ["all"]:
            if p == "all":
                df_yp = df_y
            else:
                df_yp = df_y[df_y["chuong_trinh"] == PROGRAM_CODE[p]]
            
            if len(df_yp) == 0:
                continue

            for s in SUBJECTS:
                sid = s["id"]
                if sid in df_yp.columns:
                    series = df_yp[sid].dropna()
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
                        "program": p,
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

    # Map CSV vung_mien names (full) to region IDs
    for item in provinceRankings:
        item["regionId"] = CSV_REGION_TO_ID.get(item["regionName"], "other")
    for item in regionAverages:
        item["regionId"] = CSV_REGION_TO_ID.get(item["regionName"], "other")

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
    
    out_path = Path("frontend/src/data/data.ts")
    
    final_data = {
        "YEARS": YEARS,
        "SUBJECTS": SUBJECTS,
        "REGIONS": REGIONS,
        "PROGRAMS": PROGRAMS,
        "COMBINATIONS": COMBINATIONS,
        "overviewKpis": overviewKpis,
        "nationalAverageByYear": nat_avg_yr,
        "candidatesByYear": candidates_yr,
        "subjectAverages": subjectAverages,
        "subjectYearMatrix": subjectYearMatrix,
        "underFiveRates": underFiveRates,
        "eightPlusRates": eightPlusRates,
        "provinceRankings": provinceRankings,
        "regionAverages": regionAverages,
        "regionSubjectMatrix": regionSubjectMatrix,
        "subjectDistributions": subjectDistributions,
        "combinationDistributions": combinationDistributions,
        "distributionStats": distributionStats
    }
    
    ts_content = f"const data: any = {json.dumps(final_data, ensure_ascii=False, indent=2)};\nexport default data;"
    out_path.write_text(ts_content, encoding="utf-8")

    logging.info(f"Successfully generated {out_path}")

if __name__ == "__main__":
    main()
