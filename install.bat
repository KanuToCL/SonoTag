@echo off
setlocal EnableDelayedExpansion
cd /d %~dp0

set "PYTHON_EXE="
set "PYTHON_ARGS="
call :select_python
if errorlevel 1 (
  goto :fail
)

call :ensure_venv_python
if errorlevel 1 (
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
  %PYTHON_EXE% %PYTHON_ARGS% -m venv backend\.venv
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

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo.
  echo WARNING: FFmpeg not found ^(optional but recommended for YouTube analysis^).
  echo You can install it manually from https://ffmpeg.org/download.html
  echo or via winget: winget install -e --id Gyan.FFmpeg
  echo.
  set /p INSTALL_FFMPEG=Install FFmpeg via winget? [y/N]:
  if /I "!INSTALL_FFMPEG!"=="y" (
    where winget >nul 2>nul
    if errorlevel 1 (
      echo winget not available. Please install FFmpeg manually.
    ) else (
      winget install -e --id Gyan.FFmpeg
    )
  )
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

:select_python
call :try_pylauncher
if %errorlevel%==0 exit /b 0
call :try_python
if %errorlevel%==0 exit /b 0
call :maybe_install_py311
if %errorlevel%==0 (
  call :try_pylauncher
  if %errorlevel%==0 exit /b 0
  call :try_python
  if %errorlevel%==0 exit /b 0
)
echo Python 3.10-3.12 not found. Install Python 3.11 and rerun.
exit /b 1

:ensure_venv_python
if not exist backend\.venv\Scripts\python.exe exit /b 0
backend\.venv\Scripts\python.exe -c "import sys; sys.exit(0 if (3,10) <= sys.version_info < (3,13) else 1)" >nul 2>nul
if errorlevel 1 (
  echo Existing backend\.venv uses an unsupported Python version.
  echo Recreating backend\.venv with %PYTHON_EXE% %PYTHON_ARGS% ...
  rmdir /s /q backend\.venv
  if errorlevel 1 exit /b 1
)
exit /b 0

:try_pylauncher
where py >nul 2>nul
if errorlevel 1 exit /b 1
py -3.11 -c "import sys; sys.exit(0 if sys.version_info[:2]==(3,11) else 1)" >nul 2>nul
if errorlevel 1 exit /b 1
set "PYTHON_EXE=py"
set "PYTHON_ARGS=-3.11"
exit /b 0

:try_python
where python >nul 2>nul
if errorlevel 1 exit /b 1
python -c "import sys; sys.exit(0 if (3,10) <= sys.version_info < (3,13) else 1)" >nul 2>nul
if errorlevel 1 exit /b 1
set "PYTHON_EXE=python"
set "PYTHON_ARGS="
exit /b 0

:maybe_install_py311
where winget >nul 2>nul
if errorlevel 1 exit /b 1
set /p INSTALL_PY=Python 3.11 not found. Install via winget? [y/N]:
if /I not "%INSTALL_PY%"=="y" exit /b 1
winget install -e --id Python.Python.3.11
exit /b %errorlevel%
