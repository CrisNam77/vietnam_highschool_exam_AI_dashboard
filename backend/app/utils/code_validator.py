BLOCKED_KEYWORDS = [
    "os",
    "sys",
    "subprocess",
    "shutil",
    "eval",
    "exec",
    "open(",
    "requests",
    "socket",
    "pathlib",
]


def validate_generated_code(code: str) -> tuple[bool, list[str]]:
    """Run a simple keyword-based validation pass over generated code.

    This is intentionally conservative and incomplete. A real validator and sandbox policy
    must be implemented before any generated code is executed.
    """
    normalized = code.lower()
    warnings = [
        f"Blocked keyword/import detected: {keyword}"
        for keyword in BLOCKED_KEYWORDS
        if keyword in normalized
    ]
    return len(warnings) == 0, warnings
