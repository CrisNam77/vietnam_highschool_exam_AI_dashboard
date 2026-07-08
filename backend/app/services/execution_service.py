import base64
import io
import re
import sys
import traceback

import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

import src.viz as viz


COLUMN_ALIASES = {
    "Toán": "toan",
    "toán": "toan",
    "Ngu van": "ngu_van",
    "Ngữ văn": "ngu_van",
    "Văn": "ngu_van",
    "Ngoại ngữ": "ngoai_ngu",
    "ngoại ngữ": "ngoai_ngu",
    "Vật lí": "vat_li",
    "Vật lý": "vat_li",
    "Hóa học": "hoa_hoc",
    "Sinh học": "sinh_hoc",
    "Lịch sử": "lich_su",
    "Địa lí": "dia_li",
    "Địa lý": "dia_li",
    "Tin học": "tin_hoc",
    "Công nghệ CN": "cong_nghe_cn",
    "Công nghệ NN": "cong_nghe_nn",
}


def normalize_column_aliases(code: str) -> str:
    normalized = code
    for display_name, column_name in COLUMN_ALIASES.items():
        normalized = re.sub(
            rf"(['\"]){re.escape(display_name)}\1",
            lambda match: f"{match.group(1)}{column_name}{match.group(1)}",
            normalized,
        )
    return normalized


def execute_code(code: str, df: pd.DataFrame) -> dict:
    code = normalize_column_aliases(code)
    plt.close("all")
    execution_df = df.copy(deep=True)
    exec_globals = {
        "df": execution_df,
        "pd": pd,
        "np": np,
        "plt": plt,
        "sns": sns,
        "viz": viz,
    }

    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = stdout_buffer
    sys.stderr = stderr_buffer

    success = True
    try:
        exec(code, exec_globals)
    except Exception:
        success = False
        traceback.print_exc(file=stderr_buffer)
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

    stdout = stdout_buffer.getvalue()
    stderr = stderr_buffer.getvalue()
    plot_b64 = None

    try:
        if plt.get_fignums():
            image_buffer = io.BytesIO()
            plt.savefig(image_buffer, format="png", bbox_inches="tight", dpi=150)
            image_buffer.seek(0)
            plot_b64 = base64.b64encode(image_buffer.read()).decode("utf-8")
            plt.close("all")
    except Exception as exc:
        stderr += f"\nLỗi khi trích xuất biểu đồ: {exc}"

    return {
        "success": success,
        "stdout": stdout,
        "stderr": stderr,
        "plot_b64": plot_b64,
    }
