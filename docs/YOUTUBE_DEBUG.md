# YouTube Download Issue - Technical Onboarding

> **Status:** 🔄 In Progress  
> **Branch:** `fix/youtube-api-bypass`  
> **Last Updated:** 2025-02-18

---

## Problem Statement

**YouTube audio/video download works locally but fails in Railway deployment.**

The app uses `yt-dlp` to download YouTube audio for FLAM analysis and video for playback. Locally, downloads succeed. In production (Railway), downloads fail with bot detection errors or silent failures.

---

## Root Cause Analysis

### Why YouTube Downloads Fail in Production

YouTube actively detects and blocks automated downloads from server IPs. The detection methods include:

1. **IP Reputation** - Cloud provider IPs (AWS, GCP, Railway) are flagged
2. **Request Patterns** - Server-side requests lack browser fingerprints
3. **Rate Limiting** - Aggressive throttling on datacenter IPs
4. **API Changes** - YouTube frequently changes their internal APIs; yt-dlp must keep up

### The yt-dlp Version Problem

YouTube changes their API frequently. The `yt-dlp` library releases updates (sometimes daily) to bypass new restrictions. An outdated yt-dlp version will fail where a newer one succeeds.

| Environment | yt-dlp Version | Source |
|-------------|----------------|--------|
| **Local** | Latest (via `pip install --upgrade`) | User's machine |
| **Production (Dockerfile)** | Latest (explicit upgrade step) | ✅ Good |
| **Production (nixpacks)** | `2025.1.15` (pinned in requirements.txt) | ⚠️ Potentially outdated |

---

## Codebase Architecture

### Relevant Files

```
backend/
├── app/
│   └── main.py              # FastAPI app with YouTube endpoints
├── requirements.txt         # Python dependencies (yt-dlp pinned)
Dockerfile                   # Docker build (upgrades yt-dlp)
nixpacks.toml               # Nixpacks build config
railway.json                # Railway deployment config
```

### YouTube Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /analyze-youtube` | Download audio → FLAM analysis → return tagged segments |
| `POST /prepare-youtube-video` | Download video → store for streaming |
| `GET /stream-video/{id}` | Stream prepared video to frontend |
| `GET /debug/youtube-env` | **NEW** - Debug endpoint for deployment diagnostics |

### Current Bot Detection Bypass Strategy

The code tries multiple `player_client` strategies sequentially:

```python
player_client_strategies = [
    ["ios", "web"],      # iOS client + web fallback
    ["android", "web"],  # Android client + web fallback  
    ["tv", "web"],       # TV client + web fallback
]
```

If one fails, it tries the next. This helps because YouTube may block some clients but not others.

---

## What Has Been Attempted

### Previous Attempts (Before This Session)

1. **Multi-strategy retry** - Implemented player_client rotation (already in code)
2. **502 status codes** - Return proper HTTP errors instead of 500
3. **Error message detection** - Check for "sign in", "bot", "confirm" strings

### This Session's Changes

#### 1. Debug Endpoint (`/debug/youtube-env`)

Added diagnostic endpoint to check production environment:

```python
@app.get("/debug/youtube-env")
async def debug_youtube_env():
    """Returns yt-dlp version, ffmpeg availability, system info."""
    # Returns: platform, python_version, yt_dlp.version, 
    #          ffmpeg.installed, temp_dir.writable, etc.
```

**Why:** Can't debug what we can't see. This endpoint reveals the actual runtime environment.

#### 2. Nixpacks yt-dlp Upgrade

Updated `nixpacks.toml` to upgrade yt-dlp:

```toml
[phases.install]
cmds = [
    "cd backend && pip install -r requirements.txt",
    "pip install -e openflam",
    # NEW: Upgrade yt-dlp to latest
    "pip install --upgrade 'yt-dlp[default]'"
]
```

**Why:** The Dockerfile already did this, but nixpacks.toml didn't. Railway might use either.

---

## Current Deployment Status

**Railway Build Queue:**
1. ✅ `feat: mic as default tab...` - ACTIVE (old version)
2. 🔄 `feat: add YouTube debug endpoint...` - BUILDING (~7 min)
3. 🔄 `feat: add interface-design skill...` - BUILDING (~2 min)

**Build time:** ~20 minutes (Docker with ML dependencies)

---

## Diagnosis Plan

Once deployment completes:

### Step 1: Check Debug Endpoint

```bash
curl https://app.sonotag.app/debug/youtube-env | jq
```

**Expected output:**
```json
{
  "platform": "Linux-...",
  "python_version": "3.11.x",
  "yt_dlp": {
    "installed": true,
    "version": "2025.2.x"  // Should be newer than 2025.1.15
  },
  "ffmpeg": {
    "installed": true,
    "version": "ffmpeg version 6.x..."
  },
  "temp_dir": {
    "path": "/tmp",
    "writable": true,
    "free_space_mb": 1000
  }
}
```

**What to look for:**
- `yt_dlp.version` - Is it newer than `2025.1.15`?
- `ffmpeg.installed` - Must be `true` for audio extraction
- `temp_dir.writable` - Must be `true` for downloads

### Step 2: Test YouTube Download

Try the YouTube feature in the UI. If it fails, check Railway logs for:
- Which player_client strategy failed
- Exact error message from yt-dlp
- Any new bot detection patterns

### Step 3: Iterate Based on Findings

| Finding | Action |
|---------|--------|
| yt-dlp version still old | Fix build config, force cache bust |
| ffmpeg missing | Update Dockerfile/nixpacks apt packages |
| All strategies fail with bot detection | Consider proxy solution or alternative approach |
| Specific strategy works | Reorder strategies to try working one first |

---

## Future Solutions to Consider

### If Bot Detection Persists

1. **Residential Proxy** - Route yt-dlp through residential IPs (cost ~$10-50/mo)
2. **Client-Side Download** - Have user's browser fetch audio, upload to server
3. **Alternative APIs** - Invidious instances, YouTube Data API (limited)
4. **Cookies Auth** - Use authenticated YouTube session (complex, ToS risk)

### Architecture Improvements

1. **Async Download Queue** - Don't block request while downloading
2. **Caching** - Cache downloaded audio by video ID
3. **Fallback Sources** - Try multiple sources (YouTube → Invidious → error)

---

## Commands Reference

```bash
# Check deployment status
curl https://app.sonotag.app/health

# Check YouTube environment
curl https://app.sonotag.app/debug/youtube-env | jq

# Test analyze endpoint
curl -X POST https://app.sonotag.app/analyze-youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Local yt-dlp version
pip show yt-dlp | grep Version

# Update local yt-dlp
pip install --upgrade yt-dlp
```

---

## Key Learnings

1. **yt-dlp freshness is critical** - YouTube changes APIs constantly
2. **Cloud IPs are flagged** - Bot detection is IP-reputation based
3. **Multiple strategies help** - Player client rotation increases success rate
4. **Debug endpoints are essential** - Can't fix what you can't observe
5. **20-min builds require batched changes** - Be strategic about commits

---

## Files Modified This Session

| File | Change |
|------|--------|
| `backend/app/main.py` | Added `/debug/youtube-env` endpoint |
| `nixpacks.toml` | Added yt-dlp upgrade step |
| `.claude/skills/*` | Added 23 development skills |
| `.claude/agents/*` | Added 2 agents (code-reviewer, web-research) |
| `.claude/rules/` | Already had modular-architecture.md |

---

*Document created for debugging session continuity. Update as findings emerge.*
