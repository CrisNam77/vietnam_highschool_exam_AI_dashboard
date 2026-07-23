import numpy as np
import pandas as pd

from src.feature_engineering import add_english_score


def test_add_english_score_uses_only_n1_language_code():
    df = pd.DataFrame({
        "nam": [2022, 2026, 2024],
        "ma_ngoai_ngu": ["N1", "N2", "NA"],
        "ngoai_ngu": [8.0, 7.0, 6.0],
    })

    result = add_english_score(df)

    assert result.loc[0, "diem_anh"] == 8.0
    assert np.isnan(result.loc[1, "diem_anh"])
    assert np.isnan(result.loc[2, "diem_anh"])
