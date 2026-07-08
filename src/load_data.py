from pathlib import Path

import pandas as pd


def load_processed_data(path: str | Path = "data/processed/final_data.csv") -> pd.DataFrame:
    """Load the processed exam dataset from CSV.

    The function does not download or generate data. It raises a clear error if the expected
    processed file is missing.
    """
    csv_path = Path(path)
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Processed data file not found: {csv_path}. "
            "Run the data pipeline or place final_data.csv in data/processed/."
        )
    return pd.read_csv(csv_path)
