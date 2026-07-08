import subprocess
from pathlib import Path

import streamlit as st


AI_FRONTEND_URL = "http://localhost:3000"
PROJECT_ROOT = Path(__file__).resolve().parents[1]


def start_hidden_cmd(script_name: str) -> None:
    script_path = PROJECT_ROOT / script_name
    if not script_path.exists():
        raise FileNotFoundError(f"Không tìm thấy {script_name}")

    subprocess.Popen(
        ["cmd.exe", "/c", str(script_path)],
        cwd=PROJECT_ROOT,
        creationflags=subprocess.CREATE_NO_WINDOW,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


if "ai_nextjs_started" not in st.session_state:
    start_hidden_cmd("run_backend.cmd")
    start_hidden_cmd("run_frontend.cmd")
    st.session_state["ai_nextjs_started"] = True

st.markdown(
    f"""
    <meta http-equiv="refresh" content="0; url={AI_FRONTEND_URL}">
    <script>
      window.location.replace("{AI_FRONTEND_URL}");
    </script>
    <a href="{AI_FRONTEND_URL}" target="_self" style="
        display:block;
        width:100%;
        padding:0.75rem 1rem;
        border:1px solid #d1d5db;
        border-radius:0.5rem;
        text-align:center;
        text-decoration:none;
        color:#111827;
    ">Mở AI Assistant</a>
    """,
    unsafe_allow_html=True,
)
