#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

pause_on_error() {
  echo
  read -r -p "Press Enter to close..." _
}

fail() {
  echo "$1"
  pause_on_error
  exit 1
}

trap 'echo "Install failed."; pause_on_error' ERR

PYTHON_BIN="python3"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  fail "Python 3.10+ not found. Install Python and ensure it is on PATH."
fi

if ! "$PYTHON_BIN" - <<'PY'
import sys
sys.exit(0 if sys.version_info >= (3, 10) else 1)
PY
then
  echo "Python 3.10+ required. Current:"
  "$PYTHON_BIN" -V
  fail "Python version too old."
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "npm not found. Install Node.js 18+ and restart the terminal."
fi

if ! node -e "const major=parseInt(process.versions.node.split('.')[0],10); process.exit(major>=18?0:1)"; then
  echo "Node.js 18+ required. Current:"
  node -v
  fail "Node.js version too old."
fi

if [ ! -f "backend/requirements.txt" ]; then
  fail "Missing backend/requirements.txt"
fi

if [ ! -f "frontend/package.json" ]; then
  fail "Missing frontend/package.json"
fi

if [ ! -d "backend/.venv" ]; then
  "$PYTHON_BIN" -m venv backend/.venv
fi

source backend/.venv/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

cd frontend
npm install

echo
echo "Install complete."
read -r -p "Press Enter to close..." _
