import argparse
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import unicodedata

PROVINCE_NEW = {
 "Tuyên Quang":"Trung du và miền núi phía Bắc","Cao Bằng":"Trung du và miền núi phía Bắc",
 "Lai Châu":"Trung du và miền núi phía Bắc","Điện Biên":"Trung du và miền núi phía Bắc",
 "Lạng Sơn":"Trung du và miền núi phía Bắc","Sơn La":"Trung du và miền núi phía Bắc",
 "Lào Cai":"Trung du và miền núi phía Bắc","Thái Nguyên":"Trung du và miền núi phía Bắc",
 "Phú Thọ":"Trung du và miền núi phía Bắc",
 "Hà Nội":"Đồng bằng sông Hồng","Quảng Ninh":"Đồng bằng sông Hồng",
 "Hải Phòng":"Đồng bằng sông Hồng","Bắc Ninh":"Đồng bằng sông Hồng",
 "Hưng Yên":"Đồng bằng sông Hồng","Ninh Bình":"Đồng bằng sông Hồng",
 "Huế":"Bắc Trung Bộ và Duyên hải miền Trung","Thanh Hóa":"Bắc Trung Bộ và Duyên hải miền Trung",
 "Nghệ An":"Bắc Trung Bộ và Duyên hải miền Trung","Hà Tĩnh":"Bắc Trung Bộ và Duyên hải miền Trung",
 "Đà Nẵng":"Bắc Trung Bộ và Duyên hải miền Trung","Quảng Trị":"Bắc Trung Bộ và Duyên hải miền Trung",
 "Quảng Ngãi":"Bắc Trung Bộ và Duyên hải miền Trung","Khánh Hòa":"Bắc Trung Bộ và Duyên hải miền Trung",
 "Gia Lai":"Tây Nguyên","Đắk Lắk":"Tây Nguyên","Lâm Đồng":"Tây Nguyên",
 "Hồ Chí Minh":"Đông Nam Bộ","Đồng Nai":"Đông Nam Bộ","Tây Ninh":"Đông Nam Bộ",
 "Cần Thơ":"Đồng bằng sông Cửu Long","Đồng Tháp":"Đồng bằng sông Cửu Long",
 "An Giang":"Đồng bằng sông Cửu Long","Vĩnh Long":"Đồng bằng sông Cửu Long",
 "Cà Mau":"Đồng bằng sông Cửu Long",
}

OLD_TO_NEW = {
 "01":"Hà Nội","02":"Hồ Chí Minh","03":"Hải Phòng","04":"Đà Nẵng","05":"Tuyên Quang",
 "06":"Cao Bằng","07":"Lai Châu","08":"Lào Cai","09":"Tuyên Quang","10":"Lạng Sơn",
 "11":"Thái Nguyên","12":"Thái Nguyên","13":"Lào Cai","14":"Sơn La","15":"Phú Thọ",
 "16":"Phú Thọ","17":"Quảng Ninh","18":"Bắc Ninh","19":"Bắc Ninh","21":"Hải Phòng",
 "22":"Hưng Yên","23":"Phú Thọ","24":"Ninh Bình","25":"Ninh Bình","26":"Hưng Yên",
 "27":"Ninh Bình","28":"Thanh Hóa","29":"Nghệ An","30":"Hà Tĩnh","31":"Quảng Trị",
 "32":"Quảng Trị","33":"Huế","34":"Đà Nẵng","35":"Quảng Ngãi","36":"Quảng Ngãi",
 "37":"Gia Lai","38":"Gia Lai","39":"Đắk Lắk","40":"Đắk Lắk","41":"Khánh Hòa",
 "42":"Lâm Đồng","43":"Đồng Nai","44":"Hồ Chí Minh","45":"Khánh Hòa","46":"Tây Ninh",
 "47":"Lâm Đồng","48":"Đồng Nai","49":"Tây Ninh","50":"Đồng Tháp","51":"An Giang",
 "52":"Hồ Chí Minh","53":"Đồng Tháp","54":"An Giang","55":"Cần Thơ","56":"Vĩnh Long",
 "57":"Vĩnh Long","58":"Vĩnh Long","59":"Cần Thơ","60":"Cà Mau","61":"Cà Mau",
 "62":"Điện Biên","63":"Lâm Đồng","64":"Cần Thơ",
}

CODE_2026_TO_PROVINCE = {
    "01": "Hà Nội", "04": "Cao Bằng", "08": "Tuyên Quang", "11": "Điện Biên",
    "12": "Lai Châu", "14": "Sơn La", "15": "Lào Cai", "19": "Thái Nguyên",
    "20": "Lạng Sơn", "22": "Quảng Ninh", "24": "Bắc Ninh", "25": "Phú Thọ",
    "31": "Hải Phòng", "33": "Hưng Yên", "37": "Ninh Bình", "38": "Thanh Hóa",
    "40": "Nghệ An", "42": "Hà Tĩnh", "44": "Quảng Trị", "46": "Huế",
    "48": "Đà Nẵng", "51": "Quảng Ngãi", "52": "Gia Lai", "56": "Khánh Hòa",
    "66": "Đắk Lắk", "68": "Lâm Đồng", "75": "Đồng Nai", "79": "Hồ Chí Minh",
    "80": "Tây Ninh", "82": "Đồng Tháp", "86": "Vĩnh Long", "91": "An Giang",
    "92": "Cần Thơ", "96": "Cà Mau",
}


REGION3_OF_6 = {
 "Trung du và miền núi phía Bắc":"Bắc","Đồng bằng sông Hồng":"Bắc",
 "Bắc Trung Bộ và Duyên hải miền Trung":"Trung","Tây Nguyên":"Trung",
 "Đông Nam Bộ":"Nam","Đồng bằng sông Cửu Long":"Nam",
}

def norm_tinh(s):
    if pd.isna(s) or s == "":
        return None
    s = str(s).strip()
    for prefix in ["Thành phố ", "TP. ", "TP ", "Tỉnh "]:
        if s.startswith(prefix):
            s = s[len(prefix):]
    s = s.strip()
    s = unicodedata.normalize("NFC", s)
    alias = {"Khánh Hoà":"Khánh Hòa", "Thanh Hoá":"Thanh Hóa",
             "Thừa Thiên Huế":"Huế", "TP Hồ Chí Minh":"Hồ Chí Minh"}
    return alias.get(s, s)

SCORE_COLS = [
    "toan", "ngu_van", "ngoai_ngu", "vat_li", "hoa_hoc", "sinh_hoc", 
    "lich_su", "dia_li", "gdcd", "tin_hoc", "cong_nghe_cn", "cong_nghe_nn", "gd_ktpl"
]

RENAME_2006 = {
    "SOBAODANH": "sbd", "Toán": "toan", "Văn": "ngu_van", "Lí": "vat_li", 
    "Hóa": "hoa_hoc", "Sinh": "sinh_hoc", "Sử": "lich_su", "Địa": "dia_li", 
    "Giáo dục công dân": "gdcd", "Ngoại ngữ": "ngoai_ngu", 
    "Mã môn ngoại ngữ": "ma_ngoai_ngu"
}

RENAME_2018 = {
    "SOBAODANH": "sbd", "Toán": "toan", "Văn": "ngu_van", "Lí": "vat_li", 
    "Hóa": "hoa_hoc", "Sinh": "sinh_hoc", "Sử": "lich_su", "Địa": "dia_li", 
    "Ngoại ngữ": "ngoai_ngu", "Mã môn ngoại ngữ": "ma_ngoai_ngu", 
    "Tin học": "tin_hoc", "Công nghệ công nghiệp": "cong_nghe_cn", 
    "Công nghệ nông nghiệp": "cong_nghe_nn", "Giáo dục kinh tế và pháp luật": "gd_ktpl"
}

RENAME_2026 = {
    "SBD": "sbd", "Toán": "toan", "Văn": "ngu_van", "Lý": "vat_li", "Hóa": "hoa_hoc",
    "Sinh": "sinh_hoc", "Sử": "lich_su", "Địa": "dia_li",
    "GD Kinh tế - Pháp luật": "gd_ktpl", "Tin học": "tin_hoc", "Ngoại ngữ": "ngoai_ngu",
}


def normalize_sbd(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Normalize SBD to an 8-digit string and remove invalid rows."""
    if "sbd" not in df.columns:
        raise ValueError("No SBD column found after column normalization.")

    df = df.copy()
    df["sbd"] = df["sbd"].fillna("").astype(str)
    df["sbd"] = df["sbd"].str.replace(r"\.0$", "", regex=True)
    df["sbd"] = df["sbd"].str.replace(r"\D", "", regex=True)
    df["sbd"] = df["sbd"].str.zfill(8)

    invalid_sbd_mask = df["sbd"].str.len() != 8
    stats = {"dropped_invalid_sbd": int(invalid_sbd_mask.sum())}
    return df[~invalid_sbd_mask].copy(), stats


def map_province_and_region(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Map SBD province prefixes to post-merger province/city and region columns."""
    df = df.copy()
    df["ma_tinh"] = df["sbd"].str[:2]
    df["ten_tinh"] = pd.Series(pd.NA, index=df.index, dtype=object)

    cond_old = df["nam"] <= 2025
    cond_new = df["nam"] == 2026

    if cond_old.any():
        df.loc[cond_old, "ten_tinh"] = df.loc[cond_old, "ma_tinh"].map(OLD_TO_NEW)

    strange_new_provinces = []
    if cond_new.any() and "tinh_source" in df.columns:
        source_codes = (
            df.loc[cond_new, "tinh_source"]
            .fillna("")
            .astype(str)
            .str.replace(r"\.0$", "", regex=True)
            .str.replace(r"\D", "", regex=True)
            .str.zfill(2)
        )
        mapped = source_codes.map(CODE_2026_TO_PROVINCE)
        df.loc[cond_new, "ten_tinh"] = mapped
        strange_new_provinces = sorted(source_codes[mapped.isna()].dropna().unique().tolist())
    elif cond_new.any() and "Tỉnh" in df.columns:
        normed = df.loc[cond_new, "Tỉnh"].apply(norm_tinh)
        valid_mask = normed.isin(PROVINCE_NEW.keys())
        df.loc[cond_new & valid_mask, "ten_tinh"] = normed[valid_mask]
        invalid_mask = cond_new & (~valid_mask) & df["Tỉnh"].notna() & (df["Tỉnh"] != "")
        strange_new_provinces = sorted(df.loc[invalid_mask, "Tỉnh"].dropna().unique().tolist())
    elif cond_new.any():
        df.loc[cond_new, "ten_tinh"] = df.loc[cond_new, "ma_tinh"].map(CODE_2026_TO_PROVINCE)


    df["vung_mien"] = df["ten_tinh"].map(PROVINCE_NEW)
    df["vung_3"] = df["vung_mien"].map(REGION3_OF_6)

    strange_province_mask = df["ten_tinh"].isna()
    stats = {
        "dropped_strange_province": int(strange_province_mask.sum()),
        "strange_new_provinces": strange_new_provinces,
    }
    return df[~strange_province_mask].copy(), stats


def clean_score_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Convert score columns to numeric and set out-of-range scores to NaN."""
    df = df.copy()
    out_of_bounds_by_col = {}
    for col in SCORE_COLS:
        if col not in df.columns:
            df[col] = np.nan
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")
        invalid_score_mask = (df[col] < 0) | (df[col] > 10)
        out_of_bounds_by_col[col] = int(invalid_score_mask.sum())
        df.loc[invalid_score_mask, col] = np.nan

    return df, {
        "out_of_bounds_by_col": out_of_bounds_by_col,
        "out_of_bounds_total": int(sum(out_of_bounds_by_col.values())),
    }


def clean_language_code(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize language-code values while preserving missing-language assumptions."""
    df = df.copy()
    if "ma_ngoai_ngu" not in df.columns:
        df["ma_ngoai_ngu"] = "NA"
    df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].astype(str).str.strip().str.upper()
    df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].replace(["", "NAN", "NONE", "<NA>"], "NA")
    df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].fillna("NA")
    return df


def remove_empty_score_rows(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Remove rows without any valid subject score."""
    df = df.copy()
    if "so_mon" not in df.columns:
        df["so_mon"] = df[SCORE_COLS].notna().sum(axis=1)
    so_mon_zero_mask = df["so_mon"] == 0
    stats = {"dropped_so_mon_zero": int(so_mon_zero_mask.sum())}
    return df[~so_mon_zero_mask].copy(), stats


def clean_exam_data(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Run all cleaning steps before feature engineering."""
    stats = {"raw_rows": len(df)}
    df, sbd_stats = normalize_sbd(df)
    stats.update(sbd_stats)
    df, province_stats = map_province_and_region(df)
    stats.update(province_stats)
    df, score_stats = clean_score_columns(df)
    stats.update(score_stats)
    df = clean_language_code(df)
    df, empty_stats = remove_empty_score_rows(df)
    stats.update(empty_stats)
    return df, stats



def main():
    parser = argparse.ArgumentParser(description="Script làm sạch và gộp dữ liệu điểm thi THPT.")
    parser.add_argument("--raw", type=str, default="data/raw", help="Đường dẫn thư mục chứa dữ liệu thô")
    parser.add_argument("--out", type=str, default="data/processed", help="Đường dẫn thư mục chứa dữ liệu đầu ra")
    args = parser.parse_args()

    raw_dir = Path(args.raw)
    out_dir = Path(args.out)
    
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"[*] Bắt đầu đọc dữ liệu từ thư mục {raw_dir}...")
    
    stats_raw = {}
    dfs = []
    
    # Nguồn 1: diem_thi_thpt_2022.csv
    file1 = raw_dir / "diem_thi_thpt_2022.csv"
    if file1.exists():
        df1 = pd.read_csv(file1, dtype=str, keep_default_na=False, na_values=[])
        df1["nam"] = 2022
        df1["chuong_trinh"] = "2006"
        df1["ma_ngoai_ngu"] = "NA" # Năm 2022 không có mã ngoại ngữ
        stats_raw["diem_thi_thpt_2022.csv"] = len(df1)
        dfs.append(df1)
        print(f" - Đã đọc {file1.name}: {len(df1)} dòng")

    # Nguồn 2: diem_thi_thpt_2023.csv
    file2 = raw_dir / "diem_thi_thpt_2023.csv"
    if file2.exists():
        df2 = pd.read_csv(file2, dtype=str, keep_default_na=False, na_values=[])
        df2["nam"] = 2023
        df2["chuong_trinh"] = "2006"
        stats_raw["diem_thi_thpt_2023.csv"] = len(df2)
        dfs.append(df2)
        print(f" - Đã đọc {file2.name}: {len(df2)} dòng")

    # Nguồn 3: diem_thi_thpt_2024.csv
    file3 = raw_dir / "diem_thi_thpt_2024.csv"
    if file3.exists():
        df3 = pd.read_csv(file3, dtype=str, keep_default_na=False, na_values=[])
        df3["nam"] = 2024
        df3["chuong_trinh"] = "2006"
        stats_raw["diem_thi_thpt_2024.csv"] = len(df3)
        dfs.append(df3)
        print(f" - Đã đọc {file3.name}: {len(df3)} dòng")

    # Nguồn 4: 20250715-ketquathi-ct2006.xlsx
    file4 = raw_dir / "20250715-ketquathi-ct2006.xlsx"
    if file4.exists():
        df4 = pd.read_excel(file4, sheet_name="Sheet1", dtype=str)
        if "STT" in df4.columns:
            df4 = df4.drop(columns=["STT"])
        df4 = df4.rename(columns=RENAME_2006)
        df4["nam"] = 2025
        df4["chuong_trinh"] = "2006"
        stats_raw["20250715-ketquathi-ct2006.xlsx"] = len(df4)
        dfs.append(df4)
        print(f" - Đã đọc {file4.name}: {len(df4)} dòng")

    # Nguồn 5: 20250715-ketquathi-ct2018a.xlsx
    file5 = raw_dir / "20250715-ketquathi-ct2018a.xlsx"
    if file5.exists():
        df5 = pd.read_excel(file5, sheet_name="Sheet1", dtype=str)
        if "STT" in df5.columns:
            df5 = df5.drop(columns=["STT"])
        df5 = df5.rename(columns=RENAME_2018)
        df5["nam"] = 2025
        df5["chuong_trinh"] = "2018"
        stats_raw["20250715-ketquathi-ct2018a.xlsx"] = len(df5)
        dfs.append(df5)
        print(f" - Đã đọc {file5.name}: {len(df5)} dòng")

    # Nguồn 6: 20250715-ketquathi-ct2018a_2.xlsx
    file6 = raw_dir / "20250715-ketquathi-ct2018a_2.xlsx"
    if file6.exists():
        df6 = pd.read_excel(file6, sheet_name="Sheet2", dtype=str)
        if "STT" in df6.columns:
            df6 = df6.drop(columns=["STT"])
        df6 = df6.rename(columns=RENAME_2018)
        df6["nam"] = 2025
        df6["chuong_trinh"] = "2018"
        stats_raw["20250715-ketquathi-ct2018a_2.xlsx"] = len(df6)
        dfs.append(df6)
        print(f" - Đã đọc {file6.name}: {len(df6)} dòng")

    # Nguồn 7: diem_thi_THPTQG_2026.csv
    file7 = raw_dir / "diem_thi_THPTQG_2026.csv"
    if file7.exists():
        df7 = pd.read_csv(file7, dtype=str, keep_default_na=False, na_values=[])
        df7 = df7.rename(columns=RENAME_2026)
        if "Công nghệ" in df7.columns:
            df7 = df7.drop(columns=["Công nghệ"])
        df7["nam"] = 2026
        df7["chuong_trinh"] = "2018"
        df7["ma_ngoai_ngu"] = "NA"
        df7["cong_nghe_cn"] = np.nan
        df7["cong_nghe_nn"] = np.nan
        stats_raw["diem_thi_THPTQG_2026.csv"] = len(df7)
        dfs.append(df7)
        print(f" - Đã đọc {file7.name}: {len(df7)} dòng")

    if not dfs:
        print("Không tìm thấy bất kỳ dữ liệu nào trong thư mục raw. Dừng script.")
        sys.exit(0)

    # Gộp dữ liệu
    print("[*] Đang gộp dữ liệu...")
    df = pd.concat(dfs, ignore_index=True)
    total_raw_rows = len(df)
    
    # Làm sạch SBD
    print("[*] Đang xử lý Số báo danh (SBD)...")
    df["sbd"] = df["sbd"].fillna("").astype(str)
    df["sbd"] = df["sbd"].str.replace(r"\.0$", "", regex=True)
    df["sbd"] = df["sbd"].str.replace(r"\D", "", regex=True)
    df["sbd"] = df["sbd"].str.zfill(8)
    
    # Loại bỏ các SBD không đúng 8 chữ số
    invalid_sbd_mask = df["sbd"].str.len() != 8
    dropped_invalid_sbd = int(invalid_sbd_mask.sum())
    df = df[~invalid_sbd_mask].copy()
    
    # Mã tỉnh và Vùng miền
    print("[*] Đang ánh xạ Tỉnh và Vùng miền...")
    df["ma_tinh"] = df["sbd"].str[:2]
    
    cond_old = df["nam"] <= 2025
    cond_new = df["nam"] == 2026
    
    df["ten_tinh"] = pd.Series(pd.NA, index=df.index, dtype=object)
    if cond_old.any():
        df.loc[cond_old, "ten_tinh"] = df.loc[cond_old, "ma_tinh"].map(OLD_TO_NEW)
        
    strange_new_provinces = []
    if cond_new.any() and "Tỉnh" in df.columns:
        normed = df.loc[cond_new, "Tỉnh"].apply(norm_tinh)
        valid_mask = normed.isin(PROVINCE_NEW.keys())
        df.loc[cond_new & valid_mask, "ten_tinh"] = normed[valid_mask]
        
        invalid_mask = cond_new & (~valid_mask) & df["Tỉnh"].notna() & (df["Tỉnh"] != "")
        strange_new_provinces = df.loc[invalid_mask, "Tỉnh"].unique().tolist()
        if strange_new_provinces:
            print(f"   [CẢNH BÁO] Các tên tỉnh 2026 không khớp: {strange_new_provinces}")

    df["vung_mien"] = df["ten_tinh"].map(PROVINCE_NEW)
    df["vung_3"] = df["vung_mien"].map(REGION3_OF_6)
    
    # Mã tỉnh lạ -> đếm và loại bỏ
    strange_province_mask = df["ten_tinh"].isna()
    dropped_strange_province = int(strange_province_mask.sum())
    df = df[~strange_province_mask].copy()

    # Xử lý 13 cột điểm
    print("[*] Đang ép kiểu và lọc điểm hợp lệ...")
    out_of_bounds_count = 0
    for col in SCORE_COLS:
        if col in df.columns:
            # Ép float, các chuỗi rỗng và lỗi -> NaN
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")
            # Set NaN đối với điểm nằm ngoài khoảng [0, 10]
            invalid_score_mask = (df[col] < 0) | (df[col] > 10)
            out_of_bounds_count += int(invalid_score_mask.sum())
            df.loc[invalid_score_mask, col] = np.nan
        else:
            df[col] = np.nan

    # Làm sạch mã ngoại ngữ
    print("[*] Đang chuẩn hóa mã ngoại ngữ...")
    if "ma_ngoai_ngu" in df.columns:
        df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].astype(str).str.strip().str.upper()
        df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].replace(["", "NAN", "NONE"], "NA")
        df["ma_ngoai_ngu"] = df["ma_ngoai_ngu"].fillna("NA")
    else:
        df["ma_ngoai_ngu"] = "NA"

    # Các biến dẫn xuất
    print("[*] Đang tạo các biến dẫn xuất...")
    
    # Tính số môn có điểm
    df["so_mon"] = df[SCORE_COLS].notna().sum(axis=1)
    
    # Tính Ban (chỉ tính với chuong_trinh=="2006")
    khtn_count = df[["vat_li", "hoa_hoc", "sinh_hoc"]].notna().sum(axis=1)
    khxh_count = df[["lich_su", "dia_li", "gdcd"]].notna().sum(axis=1)

    cond_2006 = df["chuong_trinh"] == "2006"
    cond_khtn = cond_2006 & (khtn_count > khxh_count)
    cond_khxh = cond_2006 & (khxh_count > khtn_count)
    cond_khac = cond_2006 & (khtn_count == khxh_count) & (khtn_count > 0)

    df["ban"] = pd.Series(np.nan, index=df.index, dtype=object)
    df.loc[cond_khtn, "ban"] = "KHTN"
    df.loc[cond_khxh, "ban"] = "KHXH"
    df.loc[cond_khac, "ban"] = "Khác"
    
    # Điểm Anh
    # 2022 và 2026 thiếu mã ngoại ngữ nên coi toàn bộ là tiếng Anh
    df["diem_anh"] = np.where(
        df["ma_ngoai_ngu"] == "N1",
        df["ngoai_ngu"],
        np.nan
    )
    
    # Điểm khối
    df["diem_khoi_a00"] = df["toan"] + df["vat_li"] + df["hoa_hoc"]
    df["diem_khoi_a01"] = df["toan"] + df["vat_li"] + df["diem_anh"]
    df["diem_khoi_b00"] = df["toan"] + df["hoa_hoc"] + df["sinh_hoc"]
    df["diem_khoi_c00"] = df["ngu_van"] + df["lich_su"] + df["dia_li"]
    df["diem_khoi_d01"] = df["toan"] + df["ngu_van"] + df["diem_anh"]

    # Loại bỏ dòng so_mon == 0
    so_mon_zero_mask = df["so_mon"] == 0
    dropped_so_mon_zero = int(so_mon_zero_mask.sum())
    df = df[~so_mon_zero_mask].copy()

    dup_key_count = int(df.duplicated(subset=["nam","chuong_trinh","sbd"], keep=False).sum())

    # Xuất dữ liệu
    print("[*] Đang lưu dữ liệu...")
    
    WIDE_COLS = [
        "nam", "chuong_trinh", "sbd", "ma_tinh", "ten_tinh", 
        "vung_mien", "vung_3", "ma_ngoai_ngu"
    ] + SCORE_COLS + [
        "so_mon", "ban", "diem_khoi_a00", "diem_khoi_a01", 
        "diem_khoi_b00", "diem_khoi_c00", "diem_khoi_d01"
    ]
    
    # Lưu định dạng WIDE
    df_wide = df[WIDE_COLS]
    wide_path = out_dir / "final_data.csv"
    df_wide.to_csv(wide_path, index=False, float_format="%.2f")
    print(f" - Đã lưu WIDE dataset: {wide_path} ({len(df_wide)} dòng)")

    # Ghi thống kê chạy thuật toán
    print("[*] Đang sinh báo cáo thống kê...")
    
    stats_md = "# Thống kê chạy xử lý dữ liệu\n\n"
    stats_md += "## 1. Dữ liệu thô\n"
    for f_name, count in stats_raw.items():
        stats_md += f"- **{f_name}**: {count} dòng\n"
    stats_md += f"\n- **Tổng số dòng sau khi gộp**: {total_raw_rows}\n\n"
    
    stats_md += "## 2. Loại dữ liệu\n"
    stats_md += f"- **Số dòng bị loại do SBD lỗi (không đúng 8 chữ số)**: {dropped_invalid_sbd}\n"
    stats_md += f"- **Số dòng bị loại do mã tỉnh lạ (không có trong danh mục)**: {dropped_strange_province}\n"
    if strange_new_provinces:
        stats_md += f"  - **Các tên tỉnh 2026 không khớp**: {', '.join(strange_new_provinces)}\n"
    stats_md += f"- **Số dòng bị loại do số môn thi = 0**: {dropped_so_mon_zero}\n"
    stats_md += f"- **Số ô điểm bị set về NaN do ngoài khoảng [0, 10]**: {out_of_bounds_count}\n"
    stats_md += f"- **Số bản ghi trùng khóa (nam, chuong_trinh, sbd) — chỉ đếm, KHÔNG loại**: {dup_key_count}\n\n"
    
    stats_md += "## 3. Dữ liệu đầu ra\n"
    stats_md += f"- **Số dòng WIDE (`final_data.csv`)**: {len(df_wide)}\n\n"
    
    stats_md += "## 4. Phân bố theo năm và chương trình\n"
    dist = df_wide.groupby(["nam", "chuong_trinh"]).size().reset_index(name="count")
    for _, row in dist.iterrows():
        stats_md += f"- Năm **{row['nam']}** - Chương trình **{row['chuong_trinh']}**: {row['count']} dòng\n"

    stats_path = out_dir / "clean_run_stats.md"
    with open(stats_path, "w", encoding="utf-8") as f:
        f.write(stats_md)
    print(f" - Đã lưu file báo cáo: {stats_path}")
    print("[*] HOÀN TẤT!")

if __name__ == "__main__":
    main()
