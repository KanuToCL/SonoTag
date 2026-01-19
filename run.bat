@echo off
setlocal
set ROOT=%~dp0
cd /d %ROOT%

call :kill_port 8000
call :kill_port 5173

if not exist backend\app\main.py (
  echo Missing backend\app\main.py
  goto :fail
)

if not exist frontend\package.json (
  echo Missing frontend\package.json
  goto :fail
)

if not exist backend\.venv\Scripts\python.exe (
  echo Please run install.bat first.
  goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm not found. Install Node.js 18+ and restart the terminal.
  goto :fail
)

backend\.venv\Scripts\python.exe -c "import fastapi, uvicorn, psutil" >nul 2>nul
if errorlevel 1 (
  echo Backend dependencies missing or corrupt. Reinstalling...
  cd /d %ROOT%backend
  call .venv\Scripts\activate.bat
  pip install -r requirements.txt
  if errorlevel 1 (
    echo Backend dependency install failed.
    goto :fail
  )
  cd /d %ROOT%
)

if not exist frontend\node_modules (
  echo Frontend dependencies missing. Running npm install...
  cd /d %~dp0frontend
  npm install
  if errorlevel 1 (
    echo Frontend dependency install failed.
    goto :fail
  )
)

start "FLAM API" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"
start "FLAM UI" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 5173 --strictPort"

timeout /t 2 >nul
start "" "http://localhost:5173"

exit /b 0

:fail
echo.
echo Run failed. Review the messages above.
pause
exit /b 1

:kill_port
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :%1 ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>nul
)
exit /b 0
