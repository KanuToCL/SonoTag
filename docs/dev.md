# Local Development

## Quick start scripts
- Windows: run `install.bat`, then `run.bat`.
- macOS: run `chmod +x *.command`, then `./install.command` and `./run.command`.

## Prerequisites
- Python 3.10-3.12 (3.11 recommended for OpenFLAM). Install scripts can prompt to install 3.11.
- Node.js 18+ (npm included)
- Git (for auto-cloning OpenFLAM during install)

## Backend
1) Create a virtual environment and install deps:

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
```

2) Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

## Frontend
1) Install and run the UI:

```bash
cd frontend
npm install
npm run dev
```

2) Optional: point the UI at a custom API base URL:

```bash
set VITE_API_BASE_URL=http://localhost:8000
```

## Notes
- The backend currently exposes `/system-info` and `/recommend-buffer` with heuristics.
- FLAM model wiring will follow once the inference service is integrated.
- The System Snapshot panel shows host specs only when the backend is running.
- Sample rate is available after starting mic monitoring.
- For FLAM integration steps, see `docs/flam_integration.md`.
- `install.bat` / `install.command` will auto-clone OpenFLAM if missing and can optionally download the model weights.
- Install scripts will recreate `backend/.venv` if it was created with an unsupported Python version.
