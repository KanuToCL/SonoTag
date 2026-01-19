@echo off
setlocal
cd /d %~dp0

where python >nul 2>nul
if errorlevel 1 (
  echo Python not found. Install Python 3.10+ and ensure it is on PATH.
  goto :fail
)

python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)"
if errorlevel 1 (
  echo Python 3.10+ required. Current:
  python -c "import sys; print(sys.version)"
  goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm not found. Install Node.js 18+ and restart the terminal.
  goto :fail
)

node -e "const major=parseInt(process.versions.node.split('.')[0],10); process.exit(major>=18?0:1)"
if errorlevel 1 (
  echo Node.js 18+ required. Current:
  node -v
  goto :fail
)

if not exist backend\requirements.txt (
  echo Missing backend\requirements.txt
  goto :fail
)

if not exist frontend\package.json (
  echo Missing frontend\package.json
  goto :fail
)

if not exist backend\.venv (
  python -m venv backend\.venv
)

call backend\.venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
if errorlevel 1 (
  echo Backend dependency install failed.
  goto :fail
)

cd /d frontend
npm install
if errorlevel 1 (
  echo Frontend dependency install failed.
  goto :fail
)

echo.
echo Install complete.
pause
exit /b 0

:fail
echo.
echo Install failed. Review the messages above.
pause
exit /b 1
