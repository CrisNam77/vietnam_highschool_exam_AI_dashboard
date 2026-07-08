"""Chart rendering helpers for Streamlit pages."""

import streamlit as st


def render_chart_placeholder(label: str = "Biểu đồ") -> None:
    """Render a temporary chart placeholder."""
    st.info(f"Placeholder: {label}.")
