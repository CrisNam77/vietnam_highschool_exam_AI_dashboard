"""KPI card helpers for the dashboard."""

import streamlit as st


def render_kpi_placeholder(label: str, value: str = "-") -> None:
    """Render a minimal KPI placeholder."""
    st.metric(label=label, value=value)
