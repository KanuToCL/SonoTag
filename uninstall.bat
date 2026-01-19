@echo off
setlocal
cd /d %~dp0

rmdir /s /q backend\.venv 2>nul
rmdir /s /q frontend\node_modules 2>nul
rmdir /s /q frontend\dist 2>nul

echo.
echo Uninstall complete.
pause
