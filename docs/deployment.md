# SonoTag Deployment Guide

## Platform: Railway

SonoTag is deployed on [Railway](https://railway.app) using a custom Dockerfile. Railway was chosen over Vercel because:

- **Long-running ML inference**: FLAM takes 10-30+ seconds per audio file
- **PyTorch support**: ~2GB model requires persistent server, not serverless
- **Full Docker control**: Custom Python 3.11 environment with ffmpeg, yt-dlp
- **WebSocket support**: Real-time progress updates during inference

### Why Not Vercel?

| Feature | Vercel (even Pro) | Railway |
|---------|------------------|---------|
| PyTorch/ML models | ❌ Too heavy for serverless | ✅ Full support |
| Long-running tasks | ❌ 10-60s timeout | ✅ Unlimited |
| Custom Docker | ❌ Limited | ✅ Full control |
| Cost for ML | $20/mo (won't work) | ~$5-10/mo |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Railway                          │
│  ┌───────────────────────────────────────────────┐  │
│  │              Docker Container                 │  │
│  │  ┌─────────────────┐  ┌────────────────────┐  │  │
│  │  │  Vite Frontend  │  │  FastAPI Backend   │  │  │
│  │  │  (static files) │  │  (uvicorn server)  │  │  │
│  │  │                 │  │                    │  │  │
│  │  │  /static/*      │  │  /api/*            │  │  │
│  │  └─────────────────┘  │  /analyze          │  │  │
│  │                       │  /download_youtube │  │  │
│  │                       │  /upload_audio     │  │  │
│  │                       └────────────────────┘  │  │
│  │                                               │  │
│  │  Dependencies:                                │  │
│  │  - Python 3.11 + PyTorch + OpenFLAM          │  │
│  │  - ffmpeg (audio processing)                 │  │
│  │  - yt-dlp (YouTube/SoundCloud download)      │  │
│  │  - Node.js + npm (frontend build)            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Configuration Files

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### `Dockerfile`
```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    nodejs \
    npm \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm ci && npm run build
RUN mkdir -p /app/backend/static && cp -r dist/* /app/backend/static/

# Install backend dependencies
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -e /app/openflam

# Update yt-dlp (YouTube frequently changes their API)
RUN pip install --no-cache-dir --upgrade yt-dlp

ENV PYTHONPATH=/app/openflam/src
ENV PORT=8000
EXPOSE 8000

WORKDIR /app/backend
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

### `.railwayignore`
```
.git
.venv
venv
__pycache__
*.pyc
node_modules
.env.local
*.log
```

### `.dockerignore`
```
.git
.venv
venv
__pycache__
*.pyc
node_modules
.env.local
*.log
frontend/node_modules
frontend/dist
```

---

## Deployment Issues & Fixes

### Issue 1: Nixpacks Python 3.12 Incompatibility
**Problem**: Railway's default Nixpacks builder used Python 3.12, which had compatibility issues with PyTorch/OpenFLAM dependencies.

**Solution**: Switched to custom Dockerfile with explicit Python 3.11:
```json
// railway.json
"builder": "DOCKERFILE"  // was "NIXPACKS"
```

### Issue 2: YouTube Download Failing
**Problem**: YouTube downloads stuck on "Loading..." with no response.

**Symptoms**:
- Frontend shows "Loading..." indefinitely
- No audio file downloaded
- FLAM heatmap shows 0 inferences

**Root Causes**:
1. Missing `ca-certificates` for SSL/TLS (YouTube API requires HTTPS)
2. Outdated `yt-dlp` (YouTube frequently changes their API)

**Solution**: Added to Dockerfile:
```dockerfile
RUN apt-get install -y ca-certificates
RUN pip install --no-cache-dir --upgrade yt-dlp
```

### Issue 3: Slow First Build (~5-6 minutes)
**Problem**: Initial deployment takes 5-6 minutes.

**Explanation**: This is expected for ML apps:
| Step | Time | Reason |
|------|------|--------|
| apt-get install | ~30s | ffmpeg, nodejs, git |
| npm ci && build | ~45s | Vite frontend build |
| pip install | ~3-4min | PyTorch is ~2GB |
| openflam install | ~30s | FLAM dependencies |

**Mitigation**: Docker layer caching. Subsequent builds that only change code (not dependencies) are ~30-60s.

### Issue 4: "Waiting for CI" Hang
**Problem**: Railway stuck on "Waiting for CI" indefinitely.

**Cause**: "Wait for CI" toggle enabled, but no GitHub Actions workflows exist.

**Solution**: Disable "Wait for CI" toggle in Railway settings.

---

## Railway Settings

### Required Settings
- **Builder**: DOCKERFILE
- **Wait for CI**: OFF (unless you add GitHub Actions)
- **Restart Policy**: ON_FAILURE with 3 retries

### Environment Variables
Railway automatically provides:
- `PORT` - The port to bind to (usually 8000)

No additional environment variables required for basic deployment.

---

## Build Times

| Scenario | Time |
|----------|------|
| Cold build (no cache) | ~5-6 min |
| Code-only changes | ~30-60s |
| Dependency changes | ~3-4 min |

---

## Monitoring

### Check Deployment Status
1. Go to Railway dashboard
2. Click on your project
3. View "Deployments" tab for build logs

### Check Runtime Logs
1. Click on the active deployment
2. View "Logs" tab for runtime output

### Common Log Messages
```
INFO:     Started server process [1]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## Troubleshooting

### FLAM Shows 0 Inferences
1. Check if audio file was downloaded successfully
2. Verify `PYTHONPATH=/app/openflam/src` is set
3. Check logs for FLAM loading errors

### YouTube Download Fails
1. Ensure `yt-dlp` is up to date: `pip install --upgrade yt-dlp`
2. Ensure `ca-certificates` is installed
3. Some videos may be geo-restricted or age-gated

### Build Fails on pip install
1. Check Python version matches 3.11
2. Verify PyTorch wheel is compatible with linux/amd64
3. Check for conflicting dependency versions

---

## Cost Estimate

Railway Hobby plan: ~$5/month base + usage

For a personal portfolio project with occasional use:
- **Expected cost**: $5-10/month
- **Heavy usage**: $15-20/month

---

## Future Optimizations

1. **Multi-stage Docker build**: Reduce final image size
2. **Pre-built PyTorch layer**: Cache PyTorch in a base image
3. **Model caching**: Store FLAM model weights in Railway volume
4. **Health checks**: Add `/health` endpoint for monitoring
