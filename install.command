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

PYTHON_BIN=""
if command -v python3.11 >/dev/null 2>&1; then
  PYTHON_BIN="python3.11"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  fail "Python 3.10+ not found. Install Python and ensure it is on PATH."
fi

if ! "$PYTHON_BIN" - <<'PY'
import sys
sys.exit(0 if (3, 10) <= sys.version_info < (3, 13) else 1)
PY
then
  echo "Python 3.10-3.12 required. Current:"
  "$PYTHON_BIN" -V
  if command -v brew >/dev/null 2>&1; then
    read -r -p "Install Python 3.11 via brew? [y/N]: " INSTALL_PY
    if [[ "$INSTALL_PY" =~ ^[Yy]$ ]]; then
      brew install python@3.11
      PYTHON_BIN="python3.11"
    else
      fail "Python version not supported."
    fi
  else
    fail "Python version not supported."
  fi
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

if [ ! -f "openflam/pyproject.toml" ]; then
  if [ -d "openflam" ]; then
    fail "Found openflam/ directory but missing pyproject.toml. Remove or fix the folder."
  fi
  if ! command -v git >/dev/null 2>&1; then
    fail "Git not found. Install Git or clone https://github.com/adobe-research/openflam manually."
  fi
  echo "Cloning OpenFLAM repo..."
  git clone https://github.com/adobe-research/openflam openflam
fi

if [ ! -d "backend/.venv" ]; then
  "$PYTHON_BIN" -m venv backend/.venv
fi

if [ -x "backend/.venv/bin/python" ]; then
  if ! backend/.venv/bin/python - <<'PY'
import sys
sys.exit(0 if (3, 10) <= sys.version_info < (3, 13) else 1)
PY
  then
    echo "Existing backend/.venv uses an unsupported Python version."
    echo "Recreating backend/.venv with $PYTHON_BIN ..."
    rm -rf backend/.venv
    "$PYTHON_BIN" -m venv backend/.venv
  fi
fi

source backend/.venv/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

echo "Installing OpenFLAM dependencies (this may take a while)..."
pip install -e openflam

# Check for FFmpeg (optional but recommended for YouTube feature)
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo
  echo "⚠️  FFmpeg not found (optional but recommended for YouTube analysis)."
  if command -v brew >/dev/null 2>&1; then
    read -r -p "Install FFmpeg via Homebrew? [y/N]: " INSTALL_FFMPEG
    if [[ "$INSTALL_FFMPEG" =~ ^[Yy]$ ]]; then
      brew install ffmpeg
    else
      echo "Skipping FFmpeg. YouTube analysis will still work but may be limited."
    fi
  else
    echo "To install manually: brew install ffmpeg"
    echo "YouTube analysis will still work but may be limited to some formats."
  fi
else
  echo "✅ FFmpeg found: $(which ffmpeg)"
fi

MODEL_PATH="openflam_ckpt/open_flam_oct17.pth"
if [ ! -f "$MODEL_PATH" ]; then
  read -r -p "Download FLAM model weights (~800MB)? [y/N]: " DOWNLOAD_MODEL
  if [[ "$DOWNLOAD_MODEL" =~ ^[Yy]$ ]]; then
    mkdir -p openflam_ckpt
    if command -v curl >/dev/null 2>&1; then
      curl -L "https://huggingface.co/kechenadobe/OpenFLAM/resolve/main/open_flam_oct17.pth" -o "$MODEL_PATH"
    elif command -v wget >/dev/null 2>&1; then
      wget -O "$MODEL_PATH" "https://huggingface.co/kechenadobe/OpenFLAM/resolve/main/open_flam_oct17.pth"
    else
      fail "Neither curl nor wget is available to download the model."
    fi
  fi
fi

cd frontend
npm install

echo
echo "Install complete."
read -r -p "Press Enter to close..." _
