import base64
import io
import sys
import traceback

import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

import src.viz as viz


def execute_code(code: str, df: pd.DataFrame) -> dict:
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
