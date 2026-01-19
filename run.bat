@echo off
setlocal EnableDelayedExpansion
set ROOT=%~dp0
cd /d %ROOT%

echo ==============================================
echo   SonoTag - FLAM Realtime Audio Console
echo ==============================================
echo.

REM =============================================================================
REM Cleanup: Kill stale sessions and processes
REM =============================================================================

echo [Cleanup] Killing stale sessions...

REM Kill processes on ports 8000 and 5173
call :kill_port 8000
call :kill_port 5173

REM Kill any lingering uvicorn processes
taskkill /F /IM python.exe /FI "WINDOWTITLE eq FLAM API*" >nul 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq FLAM UI*" >nul 2>nul

REM Clean up temporary video files from YouTube feature
echo [Cleanup] Cleaning temp files...
if exist "%TEMP%\sonotag_*" rd /s /q "%TEMP%\sonotag_*" 2>nul
del /q "%TEMP%\sonotag_*.log" 2>nul
del /q "%TEMP%\flam-api.log" 2>nul
del /q "%TEMP%\flam-ui.log" 2>nul

echo [OK] Cleanup complete
echo.

REM =============================================================================
REM Validation
REM =============================================================================

echo [Check] Validating environment...

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

echo [OK] Environment validated
echo.

REM =============================================================================
REM Configure threading for optimal performance
REM =============================================================================

REM Get number of CPU cores
for /f "tokens=2 delims==" %%a in ('wmic cpu get NumberOfLogicalProcessors /value ^| find "="') do set CPU_CORES=%%a
if not defined CPU_CORES set CPU_CORES=4

echo [Config] Detected %CPU_CORES% CPU cores

REM Set PyTorch threading environment variables
set OMP_NUM_THREADS=%CPU_CORES%
set MKL_NUM_THREADS=%CPU_CORES%
set NUMEXPR_NUM_THREADS=%CPU_CORES%
set OPENBLAS_NUM_THREADS=%CPU_CORES%

echo          PyTorch threads: %CPU_CORES%
echo.

REM =============================================================================
REM Start Backend and Frontend
REM =============================================================================

echo [Start] Launching servers...

start "FLAM API" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && set OMP_NUM_THREADS=%CPU_CORES% && set MKL_NUM_THREADS=%CPU_CORES% && uvicorn app.main:app --reload --port 8000 --host 0.0.0.0"

REM Wait for backend to start
echo          Waiting for FLAM model to load...
set READY=0
for /L %%i in (1,1,60) do (
  if !READY!==0 (
    curl -s http://localhost:8000/health >nul 2>nul
    if not errorlevel 1 (
      echo          [OK] Backend ready!
      set READY=1
    ) else (
      timeout /t 1 /nobreak >nul
    )
  )
)

if !READY!==0 (
  echo          [WARN] Backend taking longer than expected. Check the API window.
)

start "FLAM UI" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 5173 --strictPort --host"

timeout /t 3 >nul

REM =============================================================================
REM Open Browser
REM =============================================================================

echo [Browser] Opening http://localhost:5173
start "" "http://localhost:5173"

echo.
echo ==============================================
echo   SonoTag is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo ==============================================
echo.
echo Close this window to stop all services.
echo.

pause
goto :cleanup

:fail
echo.
echo Run failed. Review the messages above.
pause
exit /b 1

:cleanup
echo.
echo [Shutdown] Stopping services...
call :kill_port 8000
call :kill_port 5173
taskkill /F /FI "WINDOWTITLE eq FLAM API*" >nul 2>nul
taskkill /F /FI "WINDOWTITLE eq FLAM UI*" >nul 2>nul
echo [OK] Goodbye!
exit /b 0

:kill_port
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :%1 ^| findstr LISTENING') do (
  taskkill /F /PID %%p >nul 2>nul
)
exit /b 0
