# Multi-Platform Audio Source Support

> **Status:** Design Complete
> **Date:** 2026-02-19
> **Branch:** TBD (implement after YouTube IP issue is resolved or in parallel)

---

## Goal

Expand SonoTag from YouTube-only to a multi-platform audio analysis tool supporting YouTube, Vimeo, and SoundCloud. This is a product expansion — not a workaround for YouTube's bot detection.

---

## Decisions Made

| Decision | Choice | Reasoning |
|---|---|---|
| UI pattern | Platform tabs | Each platform has distinct options (Vimeo passwords, SoundCloud album art) |
| Platforms in v1 | All three | Ship YouTube + Vimeo + SoundCloud together |
| SoundCloud video area | Album art where video goes | No video to show; album art fills the space naturally |
| Visualizer | Deferred to v2 | Winamp-style reactive visualizer is a follow-up feature (user-selectable) |
| YouTube degradation | ⚠️ status indicator | Transparent about server limitations, doesn't block usage |

---

## Architecture

### Backend

#### Unified Download Helper

Extract duplicated download logic (currently ~60 lines copied across both endpoints) into one function:

```python
async def download_from_url(url: str, output_dir: str, audio_only: bool = True) -> dict:
    """
    Download audio/video from any supported platform.
    Returns: { platform, title, duration, file_path, thumbnail_url, has_video }
    """
```

**Platform detection and yt-dlp configuration:**

| Platform | URL patterns | yt-dlp tweaks | Extra metadata |
|---|---|---|---|
| YouTube | `youtube.com`, `youtu.be` | `player_client` rotation (5 strategies) | — |
| Vimeo | `vimeo.com` | Password param if provided | — |
| SoundCloud | `soundcloud.com` | None (permissive API) | `thumbnail` → album art URL |
| Unknown | Anything else | yt-dlp auto-detect (1800+ sites) | — |

#### Endpoints

New unified endpoints:

- `POST /analyze-url` — accepts `{ url, prompts, chunk_duration_s, max_duration_s }`. Detects platform, downloads audio, runs FLAM analysis. Response includes `platform` field.
- `POST /prepare-video` — downloads video (YouTube/Vimeo) or returns audio + album art (SoundCloud). Response includes `has_video` boolean.

Backward-compatible aliases (no breaking changes):

- `POST /analyze-youtube` → forwards to `/analyze-url`
- `POST /prepare-youtube-video` → forwards to `/prepare-video`

#### SoundCloud Response Shape

When `has_video` is `false`, the prepare endpoint returns:

```json
{
  "video_id": "abc123",
  "title": "Track Name",
  "duration_s": 240,
  "thumbnail_url": "https://i1.sndcdn.com/artworks-...",
  "audio_url": "/stream-audio/abc123",
  "has_video": false,
  "ready": true
}
```

The frontend uses `has_video` to decide rendering — no platform-specific conditionals needed.

### Frontend

#### Tab Bar

```
YouTube ⚠️ | Vimeo | SoundCloud | Microphone
```

#### Per-Tab UI

**YouTube ⚠️:**
- Amber banner: "YouTube downloads may be limited due to server restrictions. Vimeo and SoundCloud are fully supported."
- URL input, placeholder: `https://www.youtube.com/watch?v=...`
- Video player + spectrogram + FLAM detection (unchanged)

**Vimeo:**
- URL input, placeholder: `https://vimeo.com/...`
- Optional password field (appears below URL input for password-protected videos)
- Video player + spectrogram + FLAM detection

**SoundCloud:**
- URL input, placeholder: `https://soundcloud.com/artist/track`
- Album art `<img>` fills the video area + `<audio>` element for playback
- Spectrogram + FLAM detection below

**Microphone:**
- Unchanged

#### Response-Driven Rendering

The frontend reads `has_video` from the backend response:

- `has_video: true` → `<video>` element + `/stream-video/{id}` (YouTube, Vimeo)
- `has_video: false` → `<img>` album art + `<audio>` element (SoundCloud)

This is forward-compatible — any future audio-only platform works without frontend changes.

---

## Migration & Rollout

### Phase 1: Backend (one PR)
- Extract `download_from_url()` helper from duplicated code
- Add `/analyze-url` and `/prepare-video` endpoints
- Add `/stream-audio/{id}` endpoint for SoundCloud playback
- Keep old endpoints as aliases
- Add platform detection logic

### Phase 2: Frontend (one PR)
- Add Vimeo + SoundCloud tabs to tab bar
- Wire new tabs to `/analyze-url` + `/prepare-video`
- Add `has_video` conditional rendering (video vs album art)
- Add YouTube ⚠️ indicator + banner
- Add Vimeo password field (optional)

### Phase 3: Visualizer (future)
- Winamp-style audio-reactive visualizations for audio-only sources
- User-selectable visualization modes
- Not in v1

---

## What Doesn't Change

- FLAM analysis pipeline — receives audio samples regardless of source
- Spectrogram rendering — same input format
- Detection panel — identical output structure
- Labels, Prompts, Stats panels — source-agnostic

---

## Open Questions

1. **Should unknown URLs be accepted?** yt-dlp supports 1800+ sites. We could accept any URL and let yt-dlp try. Risk: unpredictable failures and no platform-specific UX.
2. **Vimeo bot detection** — untested on Railway. May need similar strategy rotation. The `/debug/youtube-test` endpoint pattern could be reused.
3. **SoundCloud Go+ tracks** — paywalled content won't download. Need graceful error message.

---

*Design validated through brainstorming session. Ready for implementation planning.*
