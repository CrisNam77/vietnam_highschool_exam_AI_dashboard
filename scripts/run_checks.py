"""Run basic local project checks."""

import compileall
import subprocess
import sys


def main() -> int:
    targets = ["backend", "src", "scripts", "tests"]
    ok = compileall.compile_path(maxlevels=0, quiet=1)
    for target in targets:
        ok = compileall.compile_file(target, quiet=1) and ok if target.endswith(".py") else compileall.compile_dir(target, quiet=1) and ok
    if not ok:
        return 1
    return subprocess.call([sys.executable, "-m", "pytest"])


if __name__ == "__main__":
    raise SystemExit(main())
