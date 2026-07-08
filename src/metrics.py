"""Metric helpers for the Streamlit dashboard."""

import pandas as pd


def get_overview_kpis(df: pd.DataFrame) -> dict:
    """Return high-level KPI values for the dashboard.

    TODO: finalize KPI definitions after the data schema is confirmed.
    """
    return {
        "total_rows": len(df),
        "total_years": df["nam"].nunique() if "nam" in df else None,
    }


def get_subject_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Return subject-level summary metrics.

    TODO: implement mean, median, standard deviation and score bands per subject.
    """
    return pd.DataFrame()


def get_yearly_trend(df: pd.DataFrame) -> pd.DataFrame:
    """Return yearly trend metrics.

    TODO: implement after choosing the primary score columns.
    """
    return pd.DataFrame()


def get_region_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Return region-level summary metrics.

    TODO: implement after confirming province and region columns.
    """
    return pd.DataFrame()


def get_score_distribution(df: pd.DataFrame, subject: str) -> pd.DataFrame:
    """Return score distribution for a selected subject.

    TODO: build bins and frequency table for Plotly charts.
    """
    return pd.DataFrame()


def get_correlation_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """Return a correlation matrix for score columns.

    TODO: select numeric score columns based on the final schema.
    """
    return pd.DataFrame()


def get_combination_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Return summary metrics for university admission combinations.

    TODO: support A00, A01, B00, C00 and D01 columns after schema confirmation.
    """
    return pd.DataFrame()
