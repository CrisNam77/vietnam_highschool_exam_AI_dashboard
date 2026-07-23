"""Feature engineering helpers for the processed exam dataset."""

from __future__ import annotations

import numpy as np
import pandas as pd

from src.clean_data import SCORE_COLS

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


def add_subject_count(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["so_mon"] = df[SCORE_COLS].notna().sum(axis=1)
    return df


def add_average_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["diem_tb"] = df[SCORE_COLS].mean(axis=1)
    return df


def add_track_column(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    khtn_count = df[["vat_li", "hoa_hoc", "sinh_hoc"]].notna().sum(axis=1)
    khxh_count = df[["lich_su", "dia_li", "gdcd"]].notna().sum(axis=1)
    cond_2006 = df["chuong_trinh"].astype(str) == "2006"

    df["ban"] = pd.Series(np.nan, index=df.index, dtype=object)
    df.loc[cond_2006 & (khtn_count > khxh_count), "ban"] = "KHTN"
    df.loc[cond_2006 & (khxh_count > khtn_count), "ban"] = "KHXH"
    df.loc[cond_2006 & (khtn_count == khxh_count) & (khtn_count > 0), "ban"] = "Khác"
    return df


def add_english_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["diem_anh"] = np.where(df["ma_ngoai_ngu"] == "N1", df["ngoai_ngu"], np.nan)
    return df


def add_combination_scores(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
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
    return df


def select_final_columns(df: pd.DataFrame) -> pd.DataFrame:
    return df[FINAL_COLS].copy()


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = add_subject_count(df)
    df = add_average_score(df)
    df = add_track_column(df)
    df = add_english_score(df)
    return add_combination_scores(df)


def add_dashboard_features(df: pd.DataFrame | None = None) -> pd.DataFrame:
    """Backward-compatible wrapper for older imports."""
    if df is None:
        raise ValueError("A dataframe is required to add dashboard features.")
    return add_features(df)
