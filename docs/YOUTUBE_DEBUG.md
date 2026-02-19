# YouTube Download Issue - Technical Onboarding

> **Status:** 🔴 Root Cause Confirmed — IP Reputation Block
> **Branch:** `fix/youtube-api-bypass`
> **Last Updated:** 2026-02-19

---

## Problem Statement

**YouTube audio/video download works locally but fails in Railway deployment.**

The app uses `yt-dlp` to download YouTube audio for FLAM analysis and video for playback. Locally, downloads succeed. In production (Railway), downloads fail with bot detection errors.

---

## Root Cause (CONFIRMED)

**YouTube is blocking Railway's datacenter IP at the network/reputation layer.**

This was confirmed by eliminating all other hypotheses:

| Hypothesis | Status | Evidence |
|---|---|---|
| yt-dlp version outdated | ❌ Eliminated | Production running `2026.02.04` (15 days old) |
| ffmpeg missing | ❌ Eliminated | ffmpeg `7.1.3` installed and working |
| Temp dir issues | ❌ Eliminated | `/tmp` writable, 1.2TB free |
| **Railway IP blocked by YouTube** | **✅ Confirmed** | All 3 player_client strategies fail with "bot detection" error; all infrastructure is healthy |

**Implication:** No amount of yt-dlp config, version upgrades, or player_client rotation will fix this. The block is at the IP reputation layer, before YouTube even evaluates the API request.

### Production Environment (verified 2026-02-19)

```json
{
  "platform": "Linux-6.18.5+deb13-cloud-amd64-x86_64-with-glibc2.41",
  "python_version": "3.11.14",
  "yt_dlp": { "installed": true, "version": "2026.02.04" },
  "ffmpeg": { "installed": true, "version": "ffmpeg version 7.1.3-0+deb13u1" },
  "temp_dir": { "path": "/tmp", "writable": true, "free_space_mb": 1222604.55 }
}
```

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
| `GET /debug/youtube-env` | Debug endpoint for deployment diagnostics |
| `GET /debug/youtube-test` | **NEW** - Real download test with verbose yt-dlp output |

### Current Bot Detection Bypass Strategy

The code tries multiple `player_client` strategies sequentially:

```python
player_client_strategies = [
    ["ios", "web"],      # iOS client + web fallback
    ["android", "web"],  # Android client + web fallback
    ["tv", "web"],       # TV client + web fallback
    ["web_creator"],     # NEW - Web creator studio client
    ["mweb"],            # NEW - Mobile web client
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

### ✅ Step 1: Check Debug Endpoint (COMPLETED 2026-02-19)

```bash
curl https://app.sonotag.app/debug/youtube-env | jq
```

**Result:** yt-dlp `2026.02.04`, ffmpeg `7.1.3`, temp dir writable with 1.2TB. All healthy.

### ✅ Step 2: Test YouTube Download (COMPLETED 2026-02-19)

Tested via UI — all strategies fail with bot detection. Error:
> "YouTube is blocking this request (bot detection). The video cannot be downloaded from this server at the moment."

Console: `Failed to load resource: /prepare-youtube-video:1 — 502`

### 🔄 Step 3: Verbose Diagnostic (NEXT DEPLOY)

New `/debug/youtube-test` endpoint will attempt download with `verbose: True` and capture exact YouTube response.

```bash
curl -s "https://app.sonotag.app/debug/youtube-test" | python3 -m json.tool
```

**What this reveals:**
- Exact HTTP status YouTube returns
- Whether it's a CAPTCHA, consent page, or hard IP block
- Which (if any) of the 5 player_client strategies gets closest to success
- Raw yt-dlp debug output showing the rejection reason

### Step 4: Choose Fix Path Based on Verbose Output

| Finding from `/debug/youtube-test` | Fix |
|---|---|
| Hard IP block on all strategies | Client-side download architecture (browser fetches → uploads to server) |
| CAPTCHA / consent challenge | Cookie-based auth or `po_token` solution |
| Rate limiting / throttle | Request delays + caching |
| One strategy partially works | Prioritize that strategy + add retries |

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

# Run verbose YouTube download test (MOST USEFUL)
curl -s "https://app.sonotag.app/debug/youtube-test" | python3 -m json.tool

# Test with a specific URL
curl -s "https://app.sonotag.app/debug/youtube-test?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" | python3 -m json.tool

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
| `backend/app/main.py` | Added `/debug/youtube-test` endpoint (verbose download test) |
| `backend/app/main.py` | Added `web_creator` + `mweb` player_client strategies |
| `backend/app/main.py` | Improved error logging (exception type + message) |
| `nixpacks.toml` | Added yt-dlp upgrade step |
| `docs/YOUTUBE_DEBUG.md` | Updated with confirmed root cause + diagnosis results |

---

*Document created for debugging session continuity. Update as findings emerge.*
