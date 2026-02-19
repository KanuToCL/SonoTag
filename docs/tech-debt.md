# Tech Debt Registry

> Generated from full codebase review — 2026-02-19
> Severity: 🔴 Critical · 🟠 Important · 🟡 Suggestion

---

## 🔴 Critical (Must Fix Before Production)

### C1. Path Traversal Vulnerability

**File:** `backend/app/main.py` (static file serving catch-all)

```python
# CURRENT — no path validation
file_path = os.path.join(static_dir, path)
if os.path.exists(file_path) and os.path.isfile(file_path):
    return FileResponse(file_path)
```

**Risk:** Attacker can request `../../etc/passwd` via crafted URL.
**Fix:** Normalize the resolved path and reject anything outside `static_dir`:

```python
abs_path = os.path.abspath(file_path)
abs_static = os.path.abspath(static_dir)
if not abs_path.startswith(abs_static):
    raise HTTPException(status_code=404, detail="Not found")
```

**Effort:** 30 min

---

### C2. Missing Dependencies in `requirements.txt`

**File:** `backend/requirements.txt`

The following packages are imported throughout the backend but never declared:

| Package | Used in |
|---------|---------|
| `librosa` | `routes/classify.py`, `routes/youtube.py`, `routes/media.py` |
| `numpy` | `routes/classify.py`, `routes/youtube.py`, `routes/media.py` |
| `torch` | `services/flam.py`, `routes/classify.py` |
| `openflam` | `services/flam.py` |

**Impact:** Fresh `pip install -r requirements.txt` will crash on first request.
**Effort:** 15 min

---

### C3. Unbounded Audio Buffer (Memory Leak)

**File:** `frontend/src/hooks/useAudioMonitoring.ts`

`audioBufferRef.current.push(samples)` grows indefinitely if classification
falls behind capture rate.

**Impact:** Browser tab crash during extended recording sessions.
**Fix:** Implement circular buffer with max size cap:

```typescript
const MAX_BUFFER_SAMPLES = audioContext.sampleRate * bufferSeconds * 2;
while (currentBufferSamples > MAX_BUFFER_SAMPLES) {
  const removed = audioBufferRef.current.shift();
  if (removed) currentBufferSamples -= removed.length;
}
```

**Effort:** 2 h

---

### C4. No Upload Size Limits

**File:** `backend/app/routes/classify.py`

Audio file uploads accepted without any size validation.

**Risk:** Denial-of-service via multi-GB uploads.
**Fix:** Validate `audio.size` before reading into memory, or add middleware:

```python
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB
if audio.size and audio.size > MAX_UPLOAD_SIZE:
    raise HTTPException(status_code=413, detail="File too large")
```

**Effort:** 1 h

---

## 🟠 Important (Should Fix)

### I1. Massive Code Duplication Across Media Hooks

**Files:**

- `frontend/src/hooks/useYouTube.ts` (172 lines)
- `frontend/src/hooks/useSoundCloud.ts` (248 lines)
- `frontend/src/hooks/useVimeo.ts` (161 lines)

~90% identical logic: AudioContext creation, ScriptProcessor setup, analyser
configuration, start/stop analysis, cleanup.

Additionally, `useClassification.ts` contains three near-identical
`classifyBuffer` implementations (`classifyCurrentBuffer`,
`classifyVideoBuffer`, `classifySoundcloudBuffer`).

**Impact:** Bug fixes must be applied 3×; maintenance nightmare.
**Fix:** Extract a generic `useMediaAnalysis` hook and a shared
`_classifyBuffer()` utility.
**Effort:** 4 h

---

### I2. CORS Wildcard Default

**File:** `backend/app/main.py`

```python
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
```

Default `*` is overly permissive.
**Fix:** Default to `"localhost:3000,localhost:5173"` for development.
**Effort:** 15 min

---

### I3. Global Mutable State Without Safety

**File:** `backend/app/state/model.py`

- `_flam_model`, `_text_embeddings`, `_prepared_videos` are bare module globals
- No thread safety (`asyncio.Lock`)
- No cache eviction or TTL on `_prepared_videos`
- Unbounded growth → memory exhaustion on long-running server

**Fix:** Use FastAPI dependency injection + `asyncio.Lock` + TTL-based cleanup.
**Effort:** 3 h

---

### I4. No Request Timeouts or Retry Logic (Frontend)

**Files:** `frontend/src/api/classify.ts`, `frontend/src/api/youtube.ts`,
`frontend/src/api/media.ts`

No `AbortController`, no retry, no exponential backoff. Network failures are
fatal to the user experience.

**Fix:** Wrap fetch calls with timeout + retry middleware.
**Effort:** 3 h

---

### I5. Type Duplication — `TimingBreakdown`

**Locations:**

1. `frontend/src/components/SettingsPanel.tsx`
2. `frontend/src/components/InferenceSettings.tsx` (or similar)
3. `frontend/src/hooks/useClassification.ts`

**Fix:** Single definition in `frontend/src/types/api.ts`, import everywhere.
**Effort:** 1 h

---

### I6. Weak Pydantic Validation

**File:** `backend/app/models/requests.py`

- URLs accepted as bare `str` (should use `HttpUrl`)
- No positive-value constraints on `chunk_duration_s`, `max_duration_s`
- No cross-field validation (`max_duration_s >= chunk_duration_s`)
- No prompt length or count limits

**Fix:** Add `Field(gt=0)`, `HttpUrl`, `@field_validator` cross-checks, and
max prompt constraints.
**Effort:** 2 h

---

### I7. Debug Endpoints Without Rate Limiting

**File:** `backend/app/routes/debug.py`

`/debug/youtube-test` triggers external downloads with no throttle — DoS
vector.

**Fix:** Add rate-limiting middleware (e.g., `slowapi`).
**Effort:** 1 h

---

### I8. Backend Download Logic Duplication

**Files:** `backend/app/routes/youtube.py`, `backend/app/routes/media.py`

Nearly identical download-and-analyze patterns duplicated across both route
files.

**Fix:** Extract shared `_download_and_analyze()` helper into
`services/download.py`.
**Effort:** 2 h

---

## 🟡 Suggestions (Nice to Have)

### S1. Migrate from ScriptProcessorNode to AudioWorklet

`ScriptProcessorNode` is deprecated. `AudioWorklet` runs on a separate thread
and won't cause main-thread jank.

**Effort:** 8 h

---

### S2. Anti-Aliasing Filter in `resampleAudio()`

**File:** `frontend/src/utils/audio.ts`

Current linear interpolation can introduce aliasing artifacts when
downsampling. Acceptable if target rate (48 kHz) is always ≥ source, but
fragile.

**Effort:** 3 h

---

### S3. Structured Logging

Replace `logging.info(f"...")` with `structlog` JSON output for production
observability.

**Effort:** 3 h

---

### S4. Prometheus Metrics

Add counters and histograms for inference latency, request throughput, strategy
success rates.

**Effort:** 4 h

---

### S5. Content-Security-Policy Header

**File:** `frontend/index.html`

No CSP meta tag — potential XSS vector.

**Effort:** 30 min

---

### S6. High-Contrast Theme for Accessibility

Current five themes lack a WCAG AA high-contrast option.

**Effort:** 2 h

---

### S7. Stronger Cache Key Hashing

**File:** `backend/app/routes/media.py`

```python
video_id = hashlib.md5(url.encode()).hexdigest()[:12]
```

MD5 truncated to 12 chars (~48 bits). Use SHA-256 with 24+ char prefix.

**Effort:** 15 min

---

### S8. Test Coverage

**Current state:** Zero test files exist anywhere in the project.

Recommended priority:
1. Utility function tests (`audio.ts`, `color.ts`, `math.ts`) — highest ROI
2. Backend API endpoint tests (`routes/classify.py`, `routes/health.py`)
3. Custom hook tests (`useClassification`, `useAudioMonitoring`)
4. Integration / smoke tests for deployment

**Effort:** 6–20 h depending on scope

---

### S9. Environment-Based Vite Proxy

**File:** `frontend/vite.config.ts`

All 12 proxy targets hard-coded to `http://localhost:8000`.

```typescript
const apiTarget = process.env.VITE_API_TARGET || "http://localhost:8000";
```

**Effort:** 30 min

---

### S10. TTL Cleanup for `_prepared_videos` Cache

**File:** `backend/app/state/model.py`

In-memory dict grows without bound. Add timestamp tracking and periodic
eviction (e.g., 1 h TTL).

**Effort:** 1 h

---

### S11. Temp Directory Leak in Debug Route

**File:** `backend/app/routes/debug.py`

`tempfile.mkdtemp()` cleanup only runs at end of function — not in a `finally`
block. Exception before cleanup leaves orphan dirs.

**Effort:** 15 min

---

### S12. Unused `target_latency_s` Parameter

**File:** `backend/app/routes/health.py` — `recommend_buffer()`

`payload.target_latency_s` is accepted but never read.

**Effort:** 15 min

---

## Priority Matrix

| Priority | ID | Issue | Effort | Impact |
|----------|----|-------|--------|--------|
| 🔴 P0 | C1 | Path traversal vulnerability | 30 min | Security |
| 🔴 P0 | C2 | Missing deps in requirements.txt | 15 min | Deployment |
| 🔴 P0 | C3 | Audio buffer memory leak | 2 h | Stability |
| 🔴 P0 | C4 | No upload size limits | 1 h | Security |
| 🟠 P1 | I1 | Media hook duplication | 4 h | Maintainability |
| 🟠 P1 | I6 | Weak Pydantic validation | 2 h | Robustness |
| 🟠 P1 | I4 | No API timeouts / retry | 3 h | Reliability |
| 🟠 P1 | I2 | CORS wildcard default | 15 min | Security |
| 🟠 P1 | I3 | Global mutable state | 3 h | Stability |
| 🟠 P1 | I7 | Debug rate limiting | 1 h | Security |
| 🟠 P1 | I8 | Backend download duplication | 2 h | Maintainability |
| 🟠 P2 | I5 | Type duplication | 1 h | Code quality |
| 🟡 P2 | S8 | Test coverage | 6–20 h | Confidence |
| 🟡 P3 | S1 | AudioWorklet migration | 8 h | Future-proofing |
| 🟡 P3 | S3 | Structured logging | 3 h | Observability |
| 🟡 P3 | S4 | Prometheus metrics | 4 h | Monitoring |

---

## Security Summary

| Vulnerability | Severity | ID | Status |
|--------------|----------|----|--------|
| Path traversal in static serving | **HIGH** | C1 | ❌ Open |
| No upload size limits | **MEDIUM** | C4 | ❌ Open |
| CORS wildcard default | **MEDIUM** | I2 | ❌ Open |
| No input sanitization on prompts | **MEDIUM** | I6 | ❌ Open |
| Debug endpoints unthrottled | **MEDIUM** | I7 | ❌ Open |
| No CSP headers | **LOW** | S5 | ❌ Open |
| Async cache race conditions | **LOW** | I3 | ❌ Open |

---

*Last updated: 2026-02-19*
