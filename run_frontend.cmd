@echo off
setlocal
cd /d "%~dp0ai_frontend"

if not exist "node_modules" (
  echo Installing frontend dependencies...
  npm install
)

set NEXT_PUBLIC_API_URL=http://localhost:8001
set BACKEND_URL=http://127.0.0.1:8001
echo Frontend local URL: http://localhost:3000
npm run dev
