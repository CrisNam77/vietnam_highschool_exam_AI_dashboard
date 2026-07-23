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



if __name__ == "__main__":
    raise SystemExit(
        "This module contains reusable cleaning functions. "
        "Run the ETL via: python scripts/build_final_data.py"
    )
