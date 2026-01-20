# SonoTag - Monetization & Legal Strategy

> **Last Updated**: January 20, 2026
> **Status**: Planning Document

---

## ⚠️ CRITICAL: OpenFLAM License Restriction

**OpenFLAM uses the Adobe Research License which is NON-COMMERCIAL ONLY.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⛔ ADOBE RESEARCH LICENSE - KEY RESTRICTION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  "The rights granted herein may be exercised for NONCOMMERCIAL             │
│   RESEARCH PURPOSES (i.e., academic research and teaching) ONLY.           │
│                                                                             │
│   Noncommercial research purposes DO NOT INCLUDE:                          │
│   - Commercial licensing or distribution                                    │
│   - Development of commercial products                                      │
│   - Any other activity that results in commercial gain"                     │
│                                                                             │
│  Source: openflam/LICENSE                                                   │
│  Copyright: © 2025, Adobe Inc. and its licensors                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What This Means for SonoTag

| Activity | Allowed? | Explanation |
|----------|----------|-------------|
| Personal use | ✅ Yes | Non-commercial |
| Academic research | ✅ Yes | Explicitly allowed |
| Teaching/education | ✅ Yes | Explicitly allowed |
| Free open-source tool | ⚠️ Maybe | Gray area if no commercial gain |
| Freemium with paid tiers | ❌ No | Commercial gain |
| SaaS subscription | ❌ No | Commercial product |
| API-as-a-Service | ❌ No | Commercial gain |
| Any monetization | ❌ No | Results in commercial gain |

### Options to Proceed with Commercial Use

#### Option 1: Contact Adobe for Commercial License
- Adobe may offer commercial licensing for FLAM
- Contact: Adobe Research licensing team
- Expect: Significant licensing fees or revenue share

#### Option 2: Use Alternative Open-Source Models
Replace FLAM with a permissively-licensed model:

| Model | License | Commercial Use | Quality |
|-------|---------|----------------|---------|
| **CLAP (LAION)** | MIT | ✅ Yes | Good |
| **AudioCLIP** | Apache 2.0 | ✅ Yes | Good |
| **Wav2CLIP** | MIT | ✅ Yes | Moderate |
| **PANNs** | MIT | ✅ Yes | Good (classification) |
| **BEATs** | MIT | ✅ Yes | Good |

**Recommendation**: CLAP (Contrastive Language-Audio Pretraining) from LAION is the most similar to FLAM and has an MIT license.

#### Option 3: Train Your Own Model
- Use open datasets (AudioSet, FSD50K, etc.)
- Train a custom model with permissive license
- High effort but full ownership

#### Option 4: Keep Non-Commercial
- SonoTag remains a free, open-source research tool
- No monetization
- Can still build portfolio/reputation

### Current Status

**SonoTag cannot be commercially monetized using OpenFLAM.**

The monetization strategies below are documented for **future reference** if:
1. Adobe grants a commercial license
2. We switch to a permissively-licensed model (CLAP, etc.)
3. We train our own model

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Monetization Strategies](#monetization-strategies)
3. [Legal Analysis](#legal-analysis)
4. [Risk Assessment Matrix](#risk-assessment-matrix)
5. [Recommended Path Forward](#recommended-path-forward)

---

## Executive Summary

SonoTag/FLAM Browser is a real-time audio analysis tool using the FLAM (Foundation Language-Audio Model) for zero-shot sound event detection. This document outlines monetization strategies and legal considerations for commercial deployment.

**Key Insight**: The legality depends heavily on **how** audio is obtained, not **what** we do with it after analysis.

---

## Monetization Strategies

### Tier 1: Fully Legal & Low Risk ✅

These strategies have no legal concerns and can be implemented immediately.

#### 1.1 SaaS Subscription Model

**Description**: Users pay monthly for access to FLAM analysis.

```
┌─────────────────────────────────────────────────────────────┐
│                    PRICING TIERS                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   FREE          STARTER        PRO            ENTERPRISE   │
│   $0/mo         $9/mo          $29/mo         Custom       │
│                                                             │
│   • 10 mins/day • 2 hrs/day    • Unlimited    • Unlimited  │
│   • Mic only    • + File upload• + API access • + SLA      │
│   • 3 prompts   • 10 prompts   • Unlimited    • + Support  │
│   • Watermark   • No watermark • Priority     • On-premise │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Revenue Potential**:
- 1,000 users × $15 avg = $15,000/mo
- Low overhead (Railway ~$20-50/mo)

**Legal Status**: ✅ **Fully Legal**
- Users analyze their own audio
- No third-party content involved
- Standard SaaS terms of service

---

#### 1.2 API-as-a-Service

**Description**: Developers pay per API call for FLAM inference.

```
┌─────────────────────────────────────────────────────────────┐
│                    API PRICING                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Endpoint                    Price per call                │
│   ─────────────────────────────────────────────             │
│   /classify-local             $0.01 per 10s audio           │
│   /batch-classify             $0.008 per 10s (bulk)         │
│   /stream-analyze             $0.02 per minute (real-time)  │
│                                                             │
│   Volume Discounts:                                         │
│   • 10K+ calls/mo: 20% off                                  │
│   • 100K+ calls/mo: 40% off                                 │
│   • Enterprise: Custom pricing                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Use Cases**:
- Podcast transcription services
- Content moderation platforms
- Accessibility tools (audio description)
- Smart home device makers

**Legal Status**: ✅ **Fully Legal**
- B2B service
- Customers responsible for their audio sources
- Clear API terms of service

---

#### 1.3 File Upload Analysis

**Description**: Users upload their own audio/video files for analysis.

**Supported Formats**:
- Audio: MP3, WAV, FLAC, OGG, M4A
- Video: MP4, MOV, WebM, AVI (extract audio)

**Legal Status**: ✅ **Fully Legal**
- User owns or has rights to uploaded content
- Similar to Google Drive, Dropbox, etc.
- Add ToS: "You warrant you have rights to uploaded content"

---

#### 1.4 Browser Extension (Freemium)

**Description**: Chrome/Firefox extension that analyzes any audio playing in browser.

```
┌─────────────────────────────────────────────────────────────┐
│  SonoTag Browser Extension                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   🎧 Currently Analyzing: Tab Audio                         │
│                                                             │
│   Detected Sounds:                                          │
│   ├── Speech (Male)     ████████████░░ 85%                 │
│   ├── Background Music  ████████░░░░░░ 62%                 │
│   └── Applause          ████░░░░░░░░░░ 31%                 │
│                                                             │
│   [Upgrade to Pro for unlimited analysis]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**How It Works**:
- Uses `chrome.tabCapture` API (requires user permission)
- Audio stays local, only analysis sent to server
- Or: fully local inference with ONNX.js (future)

**Legal Status**: ✅ **Fully Legal**
- User explicitly grants permission
- Similar to screen recorders, audio enhancers
- No content storage (real-time analysis only)

---

#### 1.5 Educational/Research Licensing

**Description**: Universities and research institutions pay for access.

**Pricing**:
- Academic License: $500/year (unlimited users in institution)
- Research API: $2,000/year (includes high-volume API access)
- Dataset Creation: Custom (bulk analysis for ML datasets)

**Legal Status**: ✅ **Fully Legal**
- B2B/B2I licensing
- Standard academic software model

---

### Tier 2: Legal with Proper Implementation ⚠️

These require careful implementation to stay legal.

#### 2.1 YouTube Analysis (Current Implementation)

**How It Works Now**:
1. User provides YouTube URL
2. Backend downloads video via yt-dlp
3. Audio extracted and analyzed
4. Video served to user's browser

**Legal Analysis**:

| Aspect | Status | Explanation |
|--------|--------|-------------|
| **Downloading** | 🟡 Gray | YouTube ToS prohibits, but rarely enforced for personal use |
| **Caching** | 🟡 Gray | Temporary caching may be defensible under fair use |
| **Re-streaming** | 🔴 Risk | Serving video from your server = redistribution |
| **Analysis only** | ✅ Legal | Analyzing audio content is transformative use |

**How to Make It Legal**:

```
Option A: Don't Store, Just Analyze (Recommended)
──────────────────────────────────────────────────
1. Extract direct stream URL (no download)
2. Stream audio chunks in real-time
3. Analyze and discard immediately
4. Never store on server

Option B: User's Own Download
──────────────────────────────────────────────────
1. User downloads video themselves (their responsibility)
2. User uploads to SonoTag
3. We analyze uploaded file
4. Legal responsibility shifts to user

Option C: YouTube IFrame + Tab Capture
──────────────────────────────────────────────────
1. Embed YouTube video (official API)
2. User shares tab audio
3. Capture via getDisplayMedia
4. Fully compliant with YouTube ToS
```

**Legal Status**: 🟡 **Gray Area → Can Be Made Fully Legal**

---

#### 2.2 Vimeo/SoundCloud Analysis

**Legal Analysis**:

| Platform | ToS on Downloading | Enforcement | Our Risk |
|----------|-------------------|-------------|----------|
| **Vimeo** | Prohibited | Low | 🟢 Low |
| **SoundCloud** | Prohibited | Low | 🟢 Low |
| **Bandcamp** | Allowed (for purchases) | N/A | ✅ None |

**How to Minimize Risk**:
- Don't store content permanently
- Process and discard
- Add disclaimer: "Ensure you have rights to analyze this content"

**Legal Status**: 🟡 **Low Risk with Disclaimers**

---

#### 2.3 Podcast/RSS Feed Analysis

**Description**: Analyze podcasts from RSS feeds.

**Legal Analysis**:
- Podcasts are publicly distributed
- RSS feeds are meant to be consumed by third parties
- Analysis is transformative use

**Legal Status**: ✅ **Likely Legal**
- Similar to podcast search engines (Podchaser, Listen Notes)
- Not storing/redistributing, just analyzing

---

### Tier 3: High Risk / Not Recommended 🔴

These have significant legal issues.

#### 3.1 Spotify/Apple Music Analysis

**Why It's Problematic**:

```
┌─────────────────────────────────────────────────────────────┐
│  DRM PROTECTION CHAIN                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Spotify Servers                                           │
│        │                                                    │
│        ▼                                                    │
│   Widevine DRM Encryption                                   │
│        │                                                    │
│        ▼                                                    │
│   Browser/App Decryption (hardware-backed)                  │
│        │                                                    │
│        ▼                                                    │
│   Audio Output (protected memory)                           │
│                                                             │
│   ❌ Circumventing DRM = DMCA violation (criminal offense)  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Legal Issues**:
1. **DMCA Section 1201**: Circumventing DRM is illegal (up to $500K fine, 5 years prison)
2. **Terms of Service**: Violation = account termination + potential lawsuit
3. **CFAA**: Unauthorized access to computer systems

**Legal Status**: 🔴 **Illegal - Do Not Implement**

---

#### 3.2 Storing/Redistributing Downloaded Content

**What Would Be Illegal**:
- Building a library of downloaded YouTube videos
- Allowing users to download videos through your service
- Creating a "cache" that persists beyond immediate analysis
- Serving video/audio to users who didn't request it

**Legal Status**: 🔴 **Copyright Infringement**

---

## Legal Analysis

### Applicable Laws

#### United States

| Law | Relevance | Risk Level |
|-----|-----------|------------|
| **DMCA (Digital Millennium Copyright Act)** | Prohibits DRM circumvention, but has safe harbors | Medium |
| **CFAA (Computer Fraud and Abuse Act)** | Unauthorized access to systems | Low (if using public APIs) |
| **Copyright Act** | Fair use analysis applies | Depends on use |
| **Terms of Service** | Contract law, not criminal | Civil liability only |

#### Fair Use Analysis (17 U.S.C. § 107)

```
┌─────────────────────────────────────────────────────────────┐
│  FAIR USE FOUR-FACTOR TEST                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. PURPOSE AND CHARACTER OF USE                            │
│     ✅ Transformative (analysis, not reproduction)          │
│     ✅ Commercial use (weighs against, but not fatal)       │
│     Score: Favorable                                        │
│                                                             │
│  2. NATURE OF COPYRIGHTED WORK                              │
│     ⚠️ Creative works (music, videos) get more protection   │
│     Score: Slightly unfavorable                             │
│                                                             │
│  3. AMOUNT AND SUBSTANTIALITY                               │
│     ✅ We analyze but don't reproduce the work              │
│     ✅ Output is metadata, not the content itself           │
│     Score: Favorable                                        │
│                                                             │
│  4. EFFECT ON MARKET                                        │
│     ✅ No market substitution (can't listen to analysis)    │
│     ✅ Doesn't compete with original                        │
│     Score: Very favorable                                   │
│                                                             │
│  OVERALL: Strong fair use case for ANALYSIS                 │
│           Weak case for STORAGE/REDISTRIBUTION              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Platform-Specific Legal Status

| Platform | Download | Analyze | Store | Redistribute |
|----------|----------|---------|-------|--------------|
| **User uploads** | N/A | ✅ Legal | ✅ With consent | ❌ Without rights |
| **Microphone** | N/A | ✅ Legal | ✅ With consent | N/A |
| **YouTube** | 🟡 ToS violation | ✅ Fair use | ⚠️ Temp only | ❌ Illegal |
| **Vimeo** | 🟡 ToS violation | ✅ Fair use | ⚠️ Temp only | ❌ Illegal |
| **SoundCloud** | 🟡 ToS violation | ✅ Fair use | ⚠️ Temp only | ❌ Illegal |
| **Spotify** | ❌ DRM/DMCA | ❌ DRM/DMCA | ❌ Illegal | ❌ Illegal |
| **Apple Music** | ❌ DRM/DMCA | ❌ DRM/DMCA | ❌ Illegal | ❌ Illegal |
| **Podcasts (RSS)** | ✅ Intended | ✅ Legal | ⚠️ Check license | ⚠️ Check license |
| **Tab capture** | N/A | ✅ Legal | ✅ User controls | N/A |

---

## Risk Assessment Matrix

```
                    LEGAL RISK
                    Low    Medium    High
                    │       │         │
    High Revenue ───┼───────┼─────────┤
         │          │  API  │ YouTube │ Spotify
         │          │ SaaS  │ Vimeo   │ Apple
    Med Revenue ────┼───────┼─────────┤
         │          │ Ext.  │SndCloud │
         │          │ Files │         │
    Low Revenue ────┼───────┼─────────┤
         │          │ Free  │         │
         │          │ Tier  │         │

    RECOMMENDATION:
    ✅ Prioritize: API, SaaS, File Upload, Extension
    ⚠️ Implement carefully: YouTube, Vimeo, SoundCloud
    ❌ Avoid: Spotify, Apple Music
```

---

## Recommended Path Forward

### Phase 1: Launch with Zero Legal Risk (Month 1-2)

**Features**:
- Microphone analysis (real-time)
- File upload analysis (user's own files)
- Free tier with limits

**Monetization**:
- Freemium model
- $9/mo starter, $29/mo pro

**Legal Requirements**:
- Standard Terms of Service
- Privacy Policy (GDPR/CCPA compliant)
- User content responsibility disclaimer

---

### Phase 2: Add Low-Risk Streaming (Month 3-4)

**Features**:
- Tab audio capture (user permission required)
- Browser extension
- Podcast/RSS analysis

**Monetization**:
- Extension freemium ($4.99/mo premium)
- API access ($29/mo+)

**Legal Requirements**:
- Extension permissions disclosure
- Clear user consent flows

---

### Phase 3: YouTube/Vimeo with Legal Safeguards (Month 5-6)

**Features**:
- YouTube analysis via tab capture (not download)
- Vimeo/SoundCloud via tab capture
- Real-time only (no storage)

**Monetization**:
- Premium feature
- Part of Pro tier

**Legal Safeguards**:
- No server-side downloads
- Tab capture only (user-initiated)
- Immediate processing, no storage
- Clear disclaimers

**Terms of Service Addition**:
```
"SonoTag analyzes audio for informational purposes only.
Users are responsible for ensuring they have the right to
analyze any content. SonoTag does not store, copy, or
redistribute any analyzed content."
```

---

### What NOT to Build

| Feature | Why Not |
|---------|---------|
| Spotify integration | DMCA violation, criminal liability |
| Apple Music integration | DRM circumvention, illegal |
| Video download/save | Copyright infringement |
| Content library/cache | Storage = infringement |
| Audio extraction service | Facilitating infringement |

---

## Legal Disclaimers to Include

### Terms of Service (Required)

```markdown
## User Responsibilities

1. You warrant that you own or have the right to analyze
   any content you submit to SonoTag.

2. You agree not to use SonoTag to infringe on any
   copyright, trademark, or other intellectual property rights.

3. SonoTag is a tool for audio analysis. The analysis results
   are provided "as is" without warranty.

4. You are solely responsible for your use of the analysis
   results and any actions you take based on them.

## Content Policy

1. SonoTag does not store your audio content beyond the
   immediate processing required for analysis.

2. Analysis results may be stored to provide you with
   history and statistics features.

3. We do not sell or share your content or analysis results
   with third parties.
```

### DMCA Safe Harbor

To qualify for DMCA safe harbor (17 U.S.C. § 512):

- [ ] Designate a DMCA agent with the Copyright Office
- [ ] Implement a repeat infringer policy
- [ ] Respond promptly to takedown notices
- [ ] Don't have actual knowledge of infringement
- [ ] Don't financially benefit directly from infringement you could control

---

## Summary

| Strategy | Legal Risk | Revenue Potential | Recommendation |
|----------|------------|-------------------|----------------|
| **SaaS (mic/upload)** | ✅ None | High | ✅ **Launch first** |
| **API service** | ✅ None | High | ✅ **Launch first** |
| **Browser extension** | ✅ Low | Medium | ✅ **Phase 2** |
| **Tab capture** | ✅ Low | Medium | ✅ **Phase 2** |
| **YouTube (tab only)** | 🟡 Low | High | ⚠️ **Phase 3** |
| **Podcast analysis** | ✅ Low | Medium | ✅ **Phase 2** |
| **Spotify/Apple** | 🔴 Criminal | N/A | ❌ **Never** |

**Bottom Line**: Build a legitimate SaaS business around user-provided content and tab capture. The YouTube convenience feature can be added later with proper legal safeguards. Never touch DRM-protected content.

---

*This document is for planning purposes and does not constitute legal advice. Consult with a qualified attorney before launching commercial services.*
