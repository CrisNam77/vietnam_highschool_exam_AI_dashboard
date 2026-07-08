from pathlib import Path

import pytest

from src.load_data import load_processed_data


def test_load_processed_data_missing_file_raises_clear_error(tmp_path: Path):
    missing_path = tmp_path / "missing.csv"

    with pytest.raises(FileNotFoundError, match="Processed data file not found"):
        load_processed_data(missing_path)
