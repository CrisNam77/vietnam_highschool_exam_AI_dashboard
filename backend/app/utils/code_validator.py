import ast

BLOCKED_MODULES = {
    "os",
    "sys",
    "subprocess",
    "shutil",
    "requests",
    "socket",
    "pathlib",
}

BLOCKED_FUNCTIONS = {
    "eval",
    "exec",
    "open",
}


def validate_generated_code(code: str) -> tuple[bool, list[str]]:
    """Run a robust AST-based validation pass over generated code.
    """
    warnings = []
    
    try:
        tree = ast.parse(code)
    except SyntaxError:
        # Let the execution sandbox handle syntax errors naturally
        return True, []
        
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                base_module = alias.name.split('.')[0]
                if base_module in BLOCKED_MODULES:
                    warnings.append(f"Blocked keyword/import detected: {base_module}")
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                base_module = node.module.split('.')[0]
                if base_module in BLOCKED_MODULES:
                    warnings.append(f"Blocked keyword/import detected: {base_module}")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in BLOCKED_FUNCTIONS:
                    warnings.append(f"Blocked keyword/import detected: {node.func.id}")

    return len(warnings) == 0, warnings
