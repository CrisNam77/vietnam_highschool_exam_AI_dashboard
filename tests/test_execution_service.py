import pandas as pd

from backend.app.services.execution_service import execute_code, normalize_sbd_modulo


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
