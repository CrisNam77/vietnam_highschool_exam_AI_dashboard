"""Table rendering helpers for Streamlit pages."""

import pandas as pd
import streamlit as st


def render_empty_table(columns: list[str]) -> None:
    """Render an empty table with the provided columns."""
    st.dataframe(pd.DataFrame(columns=columns), use_container_width=True)
