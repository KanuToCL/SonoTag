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

if not exist openflam\pyproject.toml (
  if exist openflam (
    echo Found openflam\ directory but missing pyproject.toml.
    echo Please remove or fix the folder, then re-run install.
    goto :fail
  )
  where git >nul 2>nul
  if errorlevel 1 (
    echo Git not found. Install Git or clone https://github.com/adobe-research/openflam manually.
    goto :fail
  )
  echo Cloning OpenFLAM repo...
  git clone https://github.com/adobe-research/openflam openflam
  if errorlevel 1 (
    echo OpenFLAM clone failed.
    goto :fail
  )
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

echo Installing OpenFLAM dependencies (this may take a while)...
pip install -e openflam
if errorlevel 1 (
  echo OpenFLAM install failed.
  goto :fail
)

if not exist openflam_ckpt\open_flam_oct17.pth (
  set /p DOWNLOAD_MODEL=Download FLAM model weights (~800MB)? [y/N]:
  if /I "%DOWNLOAD_MODEL%"=="y" (
    echo Downloading model to openflam_ckpt\open_flam_oct17.pth ...
    powershell -NoProfile -Command "try { New-Item -ItemType Directory -Force openflam_ckpt | Out-Null; Invoke-WebRequest -Uri 'https://huggingface.co/kechenadobe/OpenFLAM/resolve/main/open_flam_oct17.pth' -OutFile 'openflam_ckpt\\open_flam_oct17.pth' } catch { exit 1 }"
    if errorlevel 1 (
      echo Model download failed.
      goto :fail
    )
  )
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
