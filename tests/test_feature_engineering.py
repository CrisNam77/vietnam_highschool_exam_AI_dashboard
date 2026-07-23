import numpy as np
import pandas as pd

from src.feature_engineering import add_features


def test_add_all_foreign_languages_parsing():
    # Construct test data containing N1-N7, NA, and None
    df = pd.DataFrame({
        "ma_ngoai_ngu": ["N1", "N2", "N3", "N4", "N5", "N6", "N7", "NA", None],
        "ngoai_ngu": [8.0, 7.0, 6.5, 9.0, 5.5, 8.5, 7.5, 4.0, 3.0],
        # Add basic dummy columns needed by add_features
        "toan": [np.nan] * 9,
        "ngu_van": [np.nan] * 9,
        "vat_li": [np.nan] * 9,
        "hoa_hoc": [np.nan] * 9,
        "sinh_hoc": [np.nan] * 9,
        "lich_su": [np.nan] * 9,
        "dia_li": [np.nan] * 9,
        "gdcd": [np.nan] * 9,
        "tin_hoc": [np.nan] * 9,
        "cong_nghe_cn": [np.nan] * 9,
        "cong_nghe_nn": [np.nan] * 9,
        "gd_ktpl": [np.nan] * 9,
        "nam": [2024] * 9,
        "chuong_trinh": ["2006"] * 9,
    })

    result = add_features(df)

    # Expected values
    expected_diem_anh = [8.0, np.nan, np.nan, np.nan, np.nan, np.nan, np.nan, np.nan, np.nan]
    expected_diem_nga = [np.nan, 7.0, np.nan, np.nan, np.nan, np.nan, np.nan, np.nan, np.nan]
    expected_diem_phap = [np.nan, np.nan, 6.5, np.nan, np.nan, np.nan, np.nan, np.nan, np.nan]
    expected_diem_trung = [np.nan, np.nan, np.nan, 9.0, np.nan, np.nan, np.nan, np.nan, np.nan]
    expected_diem_duc = [np.nan, np.nan, np.nan, np.nan, 5.5, np.nan, np.nan, np.nan, np.nan]
    expected_diem_nhat = [np.nan, np.nan, np.nan, np.nan, np.nan, 8.5, np.nan, np.nan, np.nan]
    expected_diem_han = [np.nan, np.nan, np.nan, np.nan, np.nan, np.nan, 7.5, np.nan, np.nan]
    expected_ten_ngoai_ngu = [
        "Tiếng Anh", "Tiếng Nga", "Tiếng Pháp", "Tiếng Trung", 
        "Tiếng Đức", "Tiếng Nhật", "Tiếng Hàn", "Không thi ngoại ngữ", "Không thi ngoại ngữ"
    ]

    pd.testing.assert_series_equal(result["diem_anh"], pd.Series(expected_diem_anh, name="diem_anh"))
    pd.testing.assert_series_equal(result["diem_nga"], pd.Series(expected_diem_nga, name="diem_nga"))
    pd.testing.assert_series_equal(result["diem_phap"], pd.Series(expected_diem_phap, name="diem_phap"))
    pd.testing.assert_series_equal(result["diem_trung"], pd.Series(expected_diem_trung, name="diem_trung"))
    pd.testing.assert_series_equal(result["diem_duc"], pd.Series(expected_diem_duc, name="diem_duc"))
    pd.testing.assert_series_equal(result["diem_nhat"], pd.Series(expected_diem_nhat, name="diem_nhat"))
    pd.testing.assert_series_equal(result["diem_han"], pd.Series(expected_diem_han, name="diem_han"))
    pd.testing.assert_series_equal(result["ten_ngoai_ngu"], pd.Series(expected_ten_ngoai_ngu, name="ten_ngoai_ngu"))


def test_combination_scores_use_diem_anh_not_ngoai_ngu():
    # A student with ma_ngoai_ngu == "N4" (e.g. Chinese) should not receive A01/D01
    # English-based combination scores from their ngoai_ngu score.
    df = pd.DataFrame({
        "ma_ngoai_ngu": ["N1", "N4"],
        "ngoai_ngu": [8.0, 9.0],
        "toan": [9.0, 9.0],
        "vat_li": [8.0, 8.0],
        "ngu_van": [7.0, 7.0],
        # Add other dummy columns needed by add_features
        "hoa_hoc": [np.nan] * 2,
        "sinh_hoc": [np.nan] * 2,
        "lich_su": [np.nan] * 2,
        "dia_li": [np.nan] * 2,
        "gdcd": [np.nan] * 2,
        "tin_hoc": [np.nan] * 2,
        "cong_nghe_cn": [np.nan] * 2,
        "cong_nghe_nn": [np.nan] * 2,
        "gd_ktpl": [np.nan] * 2,
        "nam": [2024] * 2,
        "chuong_trinh": ["2006"] * 2,
    })

    result = add_features(df)

    # N1 student gets A01/D01 calculated with their English score
    assert result.loc[0, "diem_khoi_a01"] == 9.0 + 8.0 + 8.0  # toan + vat_li + diem_anh
    assert result.loc[0, "diem_khoi_d01"] == 9.0 + 7.0 + 8.0  # toan + ngu_van + diem_anh

    # N4 student should have A01/D01 as NaN because they do not have an English score (diem_anh is NaN)
    assert np.isnan(result.loc[1, "diem_khoi_a01"])
    assert np.isnan(result.loc[1, "diem_khoi_d01"])
    assert result.loc[1, "diem_trung"] == 9.0
