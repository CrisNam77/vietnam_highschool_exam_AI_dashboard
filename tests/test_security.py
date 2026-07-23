import pytest
from backend.app.api.routes.execution import run_code
from backend.app.schemas.execution import ExecutionRequest

def test_security_blocks_os_module():
    request = ExecutionRequest(code="import os\nos.system('echo hacked')", approved=True)
    response = run_code(request)
    data = response.model_dump()
    
    assert data["status"] == "rejected"
    assert data["success"] is False
    assert any("os" in warning for warning in data["logs"])

def test_security_blocks_subprocess_module():
    request = ExecutionRequest(code="import subprocess\nsubprocess.run(['ls'])", approved=True)
    response = run_code(request)
    data = response.model_dump()
    
    assert data["status"] == "rejected"
    assert data["success"] is False
    assert any("subprocess" in warning for warning in data["logs"])

def test_security_blocks_file_operations():
    request = ExecutionRequest(code="open('test.txt', 'w').write('hacked')", approved=True)
    response = run_code(request)
    data = response.model_dump()
    
    assert data["status"] == "rejected"
    assert data["success"] is False
    assert any("open(" in warning for warning in data["logs"])
