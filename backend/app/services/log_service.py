import json
from datetime import datetime
from pathlib import Path

from backend.app.core.config import settings

def _get_log_file() -> Path:
    return Path(settings.log_path)


def init_log_file() -> None:
    try:
        log_file = _get_log_file()
        log_file.parent.mkdir(parents=True, exist_ok=True)
        if not log_file.exists():
            log_file.write_text("[]", encoding="utf-8")
    except Exception as e:
        import sys
        print(f"Warning: Failed to init log file: {e}", file=sys.stderr)


def load_logs() -> list[dict]:
    init_log_file()
    try:
        return json.loads(_get_log_file().read_text(encoding="utf-8-sig"))
    except Exception:
        return []


def save_logs(logs: list[dict]) -> bool:
    init_log_file()
    try:
        _get_log_file().write_text(json.dumps(logs, ensure_ascii=False, indent=4), encoding="utf-8")
        return True
    except Exception as e:
        import sys
        print(f"Warning: Failed to save logs: {e}", file=sys.stderr)
        return False


def delete_log(timestamp: str) -> bool:
    logs = load_logs()
    next_logs = [log for log in logs if log.get("timestamp") != timestamp]
    return save_logs(next_logs)


def clear_logs() -> bool:
    return save_logs([])


def log_interaction(
    prompt: str,
    generated_code: str,
    explanation: str,
    executed_code: str,
    status: str,
    output: str,
    plot_b64: str | None = None,
    event_type: str = "execute",
    model: str | None = None,
) -> bool:
    logs = load_logs()
    logs.append(
        {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "model": model,
            "prompt": prompt,
            "generated_code": generated_code,
            "explanation": explanation,
            "executed_code": executed_code,
            "status": status,
            "output": output,
            "plot_b64": plot_b64,
        }
    )
    return save_logs(logs)


def summarize_logs() -> dict:
    logs = load_logs()
    status_counts: dict[str, int] = {}
    event_counts: dict[str, int] = {}
    recent_requests = []

    for log in logs:
        status = log.get("status", "unknown")
        event_type = log.get("event_type", "execute")
        status_counts[status] = status_counts.get(status, 0) + 1
        event_counts[event_type] = event_counts.get(event_type, 0) + 1
        if log.get("prompt"):
            recent_requests.append(
                {
                    "timestamp": log.get("timestamp"),
                    "event_type": event_type,
                    "status": status,
                    "prompt": log.get("prompt"),
                }
            )

    return {
        "total_logs": len(logs),
        "status_counts": status_counts,
        "event_counts": event_counts,
        "recent_requests": recent_requests[-10:],
    }
