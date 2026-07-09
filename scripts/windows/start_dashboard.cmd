@echo off
setlocal
cd /d "%~dp0"

start "Exam Dashboard API" cmd /k run_backend.cmd
start "Exam Dashboard Frontend" cmd /k run_frontend.cmd

echo Backend:  http://localhost:8001
echo Frontend: http://localhost:3000
