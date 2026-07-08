"""Layout helpers for Streamlit pages."""

import streamlit as st


def render_page_note(message: str) -> None:
    """Render a compact page note."""
    st.caption(message)
