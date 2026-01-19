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

trap 'echo "Run failed."; pause_on_error' ERR

kill_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      kill -9 $pids || true
    fi
  fi
}

kill_port 8000
kill_port 5173

if [ ! -f "backend/app/main.py" ]; then
  fail "Missing backend/app/main.py"
fi

if [ ! -f "frontend/package.json" ]; then
  fail "Missing frontend/package.json"
fi

if [ ! -d "backend/.venv" ]; then
  fail "Run install.command first."
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "npm not found. Install Node.js 18+ and restart the terminal."
fi

if ! node -e "const major=parseInt(process.versions.node.split('.')[0],10); process.exit(major>=18?0:1)"; then
  echo "Node.js 18+ required. Current:"
  node -v
  fail "Node.js version too old."
fi

if ! backend/.venv/bin/python - <<'PY'
import fastapi
import uvicorn
PY
then
  fail "Backend dependencies missing or corrupt. Re-run install.command."
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "Frontend dependencies missing. Running npm install..."
  (cd frontend && npm install)
fi

cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 > /tmp/flam-api.log 2>&1 &
API_PID=$!

echo "Backend PID: $API_PID"

cd ../frontend
npm run dev -- --port 5173 --strictPort > /tmp/flam-ui.log 2>&1 &
UI_PID=$!

echo "Frontend PID: $UI_PID"

sleep 2
if command -v open >/dev/null 2>&1; then
  open "http://localhost:5173"
fi

wait
