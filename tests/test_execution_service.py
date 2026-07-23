import pandas as pd

from backend.app.services.execution_service import (
    execute_code,
    normalize_column_aliases,
    normalize_province_filters,
    normalize_region_filters,
    normalize_sbd_modulo,
    normalize_track_filters,
)


def test_normalize_sbd_modulo_casts_string_identifier_to_numeric():
    code = "even = df[df['sbd'] % 2 == 0]"

    normalized = normalize_sbd_modulo(code)

    assert "pd.to_numeric(df['sbd'], errors='coerce') % 2" in normalized


def test_execute_code_supports_sbd_parity_when_sbd_is_string():
    df = pd.DataFrame(
        {
            "sbd": ["01000001", "01000002", "01000004"],
            "toan": [6.5, 8.0, 7.25],
        }
    )
    code = """
even_count = (df['sbd'] % 2 == 0).sum()
print(f"SBD chan: {even_count}")
"""

    result = execute_code(code, df)

    assert result["success"] is True
    assert "SBD chan: 2" in result["stdout"]
    assert result["stderr"] == ""


def test_normalize_region_filters_uses_three_region_column():
    code = 'df_bac = df[df["vung_mien"] == "Miền Bắc"]'

    normalized = normalize_region_filters(code)

    assert 'df["vung_3"] == "Bắc"' in normalized


def test_normalize_region_filters_supports_common_isin_labels():
    code = 'data = df[df["vung_mien"].isin(["Miền Bắc", "Miền Nam"])]'

    normalized = normalize_region_filters(code)

    assert 'df["vung_3"].isin(["Bắc", "Nam"])' in normalized


def test_normalize_track_filters_uses_track_codes():
    code = 'data = df[df["ban"] == "Khoa học tự nhiên"]'

    normalized = normalize_track_filters(code)

    assert 'df["ban"] == "KHTN"' in normalized


def test_normalize_province_filters_supports_short_city_names():
    code = 'data = df[df["ten_tinh"] == "Hà Nội"]'

    normalized = normalize_province_filters(code)

    assert 'df["ten_tinh"].str.contains' in normalized
    assert "Hà Nội" in normalized


def test_normalize_column_aliases_supports_new_english_and_combination_columns():
    code = 'result = df[["Tiếng Anh", "A02", "D14", "Điểm trung bình"]].mean()'

    normalized = normalize_column_aliases(code)

    assert '"diem_anh"' in normalized
    assert '"diem_khoi_a02"' in normalized
    assert '"diem_khoi_d14"' in normalized
    assert '"diem_tb"' in normalized


def test_execute_code_supports_common_region_labels():
    df = pd.DataFrame(
        {
            "vung_mien": ["Đồng bằng sông Hồng", "Đông Nam Bộ", "Bắc Trung Bộ"],
            "vung_3": ["Bắc", "Nam", "Trung"],
            "sinh_hoc": [7.0, 8.0, 6.5],
        }
    )
    code = """
df_bac = df[df["vung_mien"] == "Miền Bắc"]
df_nam = df[df["vung_mien"] == "Miền Nam"]
print(f"Bac: {df_bac['sinh_hoc'].dropna().shape[0]}")
print(f"Nam: {df_nam['sinh_hoc'].dropna().shape[0]}")
"""

    result = execute_code(code, df)

    assert result["success"] is True
    assert "Bac: 1" in result["stdout"]
    assert "Nam: 1" in result["stdout"]


def test_execute_code_supports_common_track_and_province_labels():
    df = pd.DataFrame(
        {
            "ten_tinh": ["Hà Nội", "Hồ Chí Minh"],
            "ban": ["KHTN", "KHXH"],
            "toan": [8.0, 7.0],
        }
    )
    code = """
hn = df[df["ten_tinh"] == "Hà Nội"]
khtn = df[df["ban"] == "Khoa học tự nhiên"]
print(f"Ha Noi: {len(hn)}")
print(f"KHTN: {len(khtn)}")
"""

    result = execute_code(code, df)

    assert result["success"] is True
    assert "Ha Noi: 1" in result["stdout"]
    assert "KHTN: 1" in result["stdout"]
