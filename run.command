#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=============================================="
echo "  SonoTag - FLAM Realtime Audio Console"
echo "=============================================="
echo

pause_on_error() {
  echo
  read -r -p "Press Enter to close..." _
}

fail() {
  echo "❌ $1"
  pause_on_error
  exit 1
}

trap 'echo "Run failed."; pause_on_error' ERR

# =============================================================================
# Cleanup: Kill stale sessions and processes
# =============================================================================

echo "🧹 Cleaning up stale sessions..."

kill_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "   Killing processes on port $port: $pids"
      kill -9 $pids 2>/dev/null || true
      sleep 0.5
    fi
  fi
}

# Kill any processes using our ports
kill_port 8000
kill_port 5173

# Kill any lingering uvicorn or vite processes from previous runs
pkill -9 -f "uvicorn app.main:app" 2>/dev/null || true
pkill -9 -f "vite.*5173" 2>/dev/null || true

# Clean up temporary video files from YouTube feature
echo "🗑️  Cleaning up temp files..."
rm -rf /tmp/sonotag_* 2>/dev/null || true
rm -rf "${TMPDIR:-/tmp}"/sonotag_* 2>/dev/null || true

# Clean up old log files
rm -f /tmp/flam-api.log /tmp/flam-ui.log /tmp/sonotag_backend.log 2>/dev/null || true

echo "✅ Cleanup complete"
echo

# =============================================================================
# Validation
# =============================================================================

echo "🔍 Validating environment..."

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

echo "✅ Environment validated"
echo

# =============================================================================
# Configure threading for optimal performance
# =============================================================================

# Get number of CPU cores for optimal threading
CPU_CORES=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)
echo "🔧 Detected $CPU_CORES CPU cores"

# Set PyTorch threading environment variables
export OMP_NUM_THREADS=$CPU_CORES
export MKL_NUM_THREADS=$CPU_CORES
export NUMEXPR_NUM_THREADS=$CPU_CORES
export OPENBLAS_NUM_THREADS=$CPU_CORES
export VECLIB_MAXIMUM_THREADS=$CPU_CORES

# Uvicorn workers (1 for dev mode with reload)
UVICORN_WORKERS=1

echo "   PyTorch threads: $CPU_CORES"
echo

# =============================================================================
# Start Backend
# =============================================================================

echo "🚀 Starting backend server..."

cd backend
source .venv/bin/activate

# Start uvicorn with threading optimizations
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0 > /tmp/flam-api.log 2>&1 &
API_PID=$!

echo "   Backend PID: $API_PID"

# Wait for backend to be ready
echo "   Waiting for FLAM model to load..."
for i in {1..60}; do
  if curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "   ✅ Backend ready!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "   ⚠️  Backend taking longer than expected. Check /tmp/flam-api.log"
  fi
  sleep 1
done

# =============================================================================
# Start Frontend
# =============================================================================

echo "🚀 Starting frontend server..."

cd ../frontend
npm run dev -- --port 5173 --strictPort --host > /tmp/flam-ui.log 2>&1 &
UI_PID=$!

echo "   Frontend PID: $UI_PID"
echo

# =============================================================================
# Open Browser
# =============================================================================

sleep 2
echo "🌐 Opening browser..."
if command -v open >/dev/null 2>&1; then
  open "http://localhost:5173"
fi

echo
echo "=============================================="
echo "  SonoTag is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  Logs:     /tmp/flam-api.log, /tmp/flam-ui.log"
echo "=============================================="
echo
echo "Press Ctrl+C to stop all services..."
echo

# Trap Ctrl+C to cleanup
cleanup() {
  echo
  echo "🛑 Shutting down..."
  kill $API_PID 2>/dev/null || true
  kill $UI_PID 2>/dev/null || true
  kill_port 8000
  kill_port 5173
  echo "✅ Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM

wait
