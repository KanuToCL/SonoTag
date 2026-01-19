import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const fallbackRecommendation = (cores, memoryGb) => {
  if (cores <= 4 || memoryGb <= 4) {
    return 10;
  }
  if (cores <= 8 || memoryGb <= 8) {
    return 5;
  }
  return 2;
};

const formatValue = (value, suffix) => {
  if (value === null || value === undefined || value === "") {
    return "unknown";
  }
  return `${value}${suffix || ""}`;
};

const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) {
    return "unknown";
  }
  const gb = bytes / 1024 / 1024 / 1024;
  return `${gb.toFixed(1)} GB`;
};

const formatHz = (value, withUnit = false) => {
  if (!Number.isFinite(value)) {
    return "--";
  }
  if (value >= 1000) {
    const rounded = Math.round(value / 100) / 10;
    return withUnit ? `${rounded} kHz` : `${rounded}k`;
  }
  return withUnit ? `${Math.round(value)} Hz` : `${Math.round(value)}`;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const CATEGORY_BANDS = [
  { label: "man speaking", start: 0.02, end: 0.12 },
  { label: "shouting", start: 0.1, end: 0.22 },
  { label: "rock music", start: 0.18, end: 0.5 },
  { label: "car engine accel", start: 0.04, end: 0.16 },
  { label: "hard braking", start: 0.06, end: 0.2 },
  { label: "glass breaking", start: 0.32, end: 0.7 },
];

const HEAT_COLORS = [
  { stop: 0, color: [26, 20, 16] },
  { stop: 0.3, color: [88, 52, 29] },
  { stop: 0.55, color: [156, 88, 45] },
  { stop: 0.78, color: [214, 142, 72] },
  { stop: 1, color: [244, 219, 173] },
];

const lerp = (start, end, amount) => start + (end - start) * amount;

const heatColor = (value) => {
  const clamped = Math.min(1, Math.max(0, value));
  let start = HEAT_COLORS[0];
  let end = HEAT_COLORS[HEAT_COLORS.length - 1];

  for (let i = 0; i < HEAT_COLORS.length - 1; i += 1) {
    const current = HEAT_COLORS[i];
    const next = HEAT_COLORS[i + 1];
    if (clamped >= current.stop && clamped <= next.stop) {
      start = current;
      end = next;
      break;
    }
  }

  const range = end.stop - start.stop || 1;
  const t = (clamped - start.stop) / range;
  const r = Math.round(lerp(start.color[0], end.color[0], t));
  const g = Math.round(lerp(start.color[1], end.color[1], t));
  const b = Math.round(lerp(start.color[2], end.color[2], t));

  return `rgb(${r}, ${g}, ${b})`;
};

const averageBand = (freqData, startPct, endPct) => {
  const start = Math.floor(startPct * freqData.length);
  const end = Math.max(start + 1, Math.floor(endPct * freqData.length));
  let sum = 0;
  for (let i = start; i < end; i += 1) {
    sum += freqData[i];
  }
  return sum / (end - start) / 255;
};

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [permissionState, setPermissionState] = useState("unknown");
  const [status, setStatus] = useState("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const [backendInfo, setBackendInfo] = useState(null);
  const [backendError, setBackendError] = useState("");
  const [recommendation, setRecommendation] = useState({
    buffer: null,
    rationale: "",
    source: "",
  });
  const [sampleRate, setSampleRate] = useState(null);
  const [freqMin, setFreqMin] = useState(0);
  const [freqMax, setFreqMax] = useState(12000);

  const spectrogramRef = useRef(null);
  const heatmapRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);

  const browserInfo = useMemo(
    () => ({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      language: navigator.language,
    }),
    []
  );

  const handleFreqMinChange = (event) => {
    const value = Number(event.target.value);
    setFreqMin(Number.isNaN(value) ? 0 : value);
  };

  const handleFreqMaxChange = (event) => {
    const value = Number(event.target.value);
    setFreqMax(Number.isNaN(value) ? nyquist : value);
  };

  const setFullRange = () => {
    setFreqMin(0);
    setFreqMax(Math.round(nyquist));
  };

  const nyquist = sampleRate ? sampleRate / 2 : 24000;
  const freqRange = useMemo(() => {
    const min = clamp(Number(freqMin) || 0, 0, nyquist);
    const maxCandidate = Number(freqMax) || nyquist;
    const max = clamp(maxCandidate, 0, nyquist);
    const safeMax = max <= min ? Math.min(nyquist, min + 100) : max;
    return { min, max: safeMax };
  }, [freqMax, freqMin, nyquist]);

  const freqAxisLabels = useMemo(() => {
    const steps = 4;
    const labels = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const value = freqRange.max - t * (freqRange.max - freqRange.min);
      labels.push(formatHz(value, true));
    }
    return labels;
  }, [freqRange.max, freqRange.min]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError("Browser does not support device enumeration.");
      return;
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const inputs = allDevices.filter((device) => device.kind === "audioinput");
      setDevices(inputs);
      if (!selectedDeviceId && inputs.length > 0) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
    } catch (err) {
      setError("Failed to enumerate audio devices.");
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
    if (!navigator.mediaDevices?.addEventListener) {
      return undefined;
    }

    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
    };
  }, [refreshDevices]);

  useEffect(() => {
    let cancelled = false;

    const loadBackendInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/system-info`);
        if (!response.ok) {
          throw new Error("Backend not ready");
        }
        const data = await response.json();
        if (!cancelled) {
          setBackendInfo(data);
        }
      } catch (err) {
        if (!cancelled) {
          setBackendError("Backend unavailable. Using browser-only info.");
        }
      }
    };

    const loadRecommendation = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/recommend-buffer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_latency_s: 2.0 }),
        });
        if (!response.ok) {
          throw new Error("Recommendation not available");
        }
        const data = await response.json();
        if (!cancelled) {
          setRecommendation({
            buffer: data.recommended_buffer_s,
            rationale: data.rationale,
            source: "backend",
          });
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = fallbackRecommendation(
            browserInfo.hardwareConcurrency,
            browserInfo.deviceMemory
          );
          setRecommendation({
            buffer: fallback,
            rationale: "Browser heuristic based on core count and memory.",
            source: "browser",
          });
        }
      }
    };

    loadBackendInfo();
    loadRecommendation();

    return () => {
      cancelled = true;
    };
  }, [browserInfo.deviceMemory, browserInfo.hardwareConcurrency]);

  useEffect(() => {
    if (!sampleRate) {
      return;
    }
    setFreqMin((current) => clamp(Number(current) || 0, 0, nyquist));
    setFreqMax((current) => clamp(Number(current) || nyquist, 0, nyquist));
  }, [nyquist, sampleRate]);

  const stopMonitoring = useCallback(async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setStatus("stopped");
    setLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState("granted");
      stream.getTracks().forEach((track) => track.stop());
      await refreshDevices();
      return true;
    } catch (err) {
      setPermissionState("denied");
      setError("Microphone permission denied.");
      return false;
    }
  };

  const startMonitoring = async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser does not support audio capture.");
      return;
    }

    const granted =
      permissionState === "granted" ? true : await requestPermission();
    if (!granted) {
      return;
    }

    const constraints =
      selectedDeviceId && selectedDeviceId !== "default"
        ? { audio: { deviceId: { exact: selectedDeviceId } } }
        : { audio: true };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      await stopMonitoring();

      const audioContext = new AudioContext();
      await audioContext.resume();

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(analyser.fftSize);

      const spectrogramCanvas = spectrogramRef.current;
      const spectrogramContext = spectrogramCanvas
        ? spectrogramCanvas.getContext("2d")
        : null;
      const heatmapCanvas = heatmapRef.current;
      const heatmapContext = heatmapCanvas
        ? heatmapCanvas.getContext("2d")
        : null;

      if (spectrogramContext && spectrogramCanvas) {
        spectrogramContext.imageSmoothingEnabled = false;
        spectrogramContext.fillStyle = "#1a120d";
        spectrogramContext.fillRect(
          0,
          0,
          spectrogramCanvas.width,
          spectrogramCanvas.height
        );
      }

      if (heatmapContext && heatmapCanvas) {
        heatmapContext.imageSmoothingEnabled = false;
        heatmapContext.fillStyle = "#1a120d";
        heatmapContext.fillRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
      }

      const draw = () => {
        if (
          !analyserRef.current ||
          !spectrogramContext ||
          !spectrogramCanvas ||
          !heatmapContext ||
          !heatmapCanvas
        ) {
          return;
        }

        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i += 1) {
          const value = (timeData[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / timeData.length);
        setLevel(rms);

        analyser.getByteFrequencyData(freqData);

        spectrogramContext.drawImage(spectrogramCanvas, -1, 0);
        const range = freqRange.max - freqRange.min || 1;
        for (let y = 0; y < spectrogramCanvas.height; y += 1) {
          const freq = freqRange.min + (y / spectrogramCanvas.height) * range;
          const index = Math.floor((freq / nyquist) * bufferLength);
          const safeIndex = clamp(index, 0, bufferLength - 1);
          const intensity = freqData[safeIndex] / 255;
          spectrogramContext.fillStyle = heatColor(intensity);
          spectrogramContext.fillRect(
            spectrogramCanvas.width - 1,
            spectrogramCanvas.height - y - 1,
            1,
            1
          );
        }

        heatmapContext.drawImage(heatmapCanvas, -1, 0);
        const rowHeight = heatmapCanvas.height / CATEGORY_BANDS.length;
        CATEGORY_BANDS.forEach((band, row) => {
          const value = averageBand(freqData, band.start, band.end);
          heatmapContext.fillStyle = heatColor(value);
          heatmapContext.fillRect(
            heatmapCanvas.width - 1,
            row * rowHeight,
            1,
            rowHeight
          );
        });

        rafRef.current = requestAnimationFrame(draw);
      };

      analyserRef.current = analyser;
      sourceRef.current = source;
      audioContextRef.current = audioContext;
      streamRef.current = stream;
      setSampleRate(audioContext.sampleRate);
      setStatus("running");
      rafRef.current = requestAnimationFrame(draw);
    } catch (err) {
      setError("Unable to start microphone capture.");
    }
  };

  const levelPercent = Math.min(100, Math.round(level * 140));
  const hostCpuLogical =
    backendInfo?.cpu?.logical_cores ?? backendInfo?.cpu_count ?? null;
  const hostCpuPhysical = backendInfo?.cpu?.physical_cores ?? null;
  const hostCpuModel = backendInfo?.cpu?.model ?? null;
  const hostMemoryBytes = backendInfo?.memory?.total_bytes ?? null;
  const hostPlatform = backendInfo?.platform ?? null;
  const hostGpus = backendInfo?.gpus ?? [];

  return (
    <div className="page">
      <header className="header">
        <div className="title-block">
          <p className="eyebrow">FLAM Browser</p>
          <h1>Realtime audio console</h1>
          <p className="subhead">
            Monitor microphone input, tune frequency range, and preview
            spectrograms before FLAM inference.
          </p>
        </div>
        <div className="status">
          <span className={`pill ${status}`}>{status}</span>
          <span className="meta">API: {API_BASE_URL}</span>
        </div>
      </header>

      <div className="layout">
        <aside className="panel controls">
          <section className="block">
            <h2>Capture</h2>
            <div className="stack">
              <label className="label" htmlFor="device-select">
                Microphone
              </label>
              <select
                id="device-select"
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
              >
                {devices.length === 0 && <option>No devices found</option>}
                {devices.map((device, index) => (
                  <option key={device.deviceId || index} value={device.deviceId}>
                    {device.label || `Mic ${index + 1}`}
                  </option>
                ))}
              </select>
              <div className="row">
                <button type="button" onClick={requestPermission}>
                  Request access
                </button>
                <button
                  type="button"
                  onClick={refreshDevices}
                  className="ghost"
                >
                  Refresh devices
                </button>
              </div>
              <div className="row">
                <button type="button" onClick={startMonitoring}>
                  Start monitoring
                </button>
                <button type="button" onClick={stopMonitoring} className="ghost">
                  Stop
                </button>
              </div>
              <p className="muted">Permission: {permissionState}</p>
              {error && <p className="error">{error}</p>}
            </div>

            <div className="meter">
              <div className="meter-label">
                Mic level <span>{levelPercent}%</span>
              </div>
              <div className="meter-track">
                <div
                  className="meter-fill"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
            </div>
          </section>

          <section className="block">
            <h2>System snapshot</h2>
            <div className="stack">
              <div className="section-label">Host (backend)</div>
              <div className="info-line">
                <span>CPU threads</span>
                <span>{formatValue(hostCpuLogical)}</span>
              </div>
              {hostCpuPhysical && (
                <div className="info-line">
                  <span>CPU cores</span>
                  <span>{formatValue(hostCpuPhysical)}</span>
                </div>
              )}
              {hostCpuModel && (
                <div className="info-line">
                  <span>CPU model</span>
                  <span>{hostCpuModel}</span>
                </div>
              )}
              <div className="info-line">
                <span>Memory</span>
                <span>{formatBytes(hostMemoryBytes)}</span>
              </div>
              {hostGpus.length > 0 ? (
                hostGpus.map((gpu, index) => (
                  <div className="info-line" key={`${gpu.name}-${index}`}>
                    <span>{`GPU ${index + 1}`}</span>
                    <span>
                      {gpu?.name || "unknown"}
                      {gpu?.memory_bytes
                        ? ` (${formatBytes(gpu.memory_bytes)})`
                        : ""}
                    </span>
                  </div>
                ))
              ) : (
                <div className="info-line">
                  <span>GPU</span>
                  <span>unknown</span>
                </div>
              )}
              <div className="info-line">
                <span>Host OS</span>
                <span>{formatValue(hostPlatform)}</span>
              </div>
              <div className="info-line">
                <span>Sample rate</span>
                <span>{formatValue(sampleRate, " Hz")}</span>
              </div>

              <div className="section-label">Browser view</div>
              <div className="info-line">
                <span>Reported cores</span>
                <span>{formatValue(browserInfo.hardwareConcurrency)}</span>
              </div>
              <div className="info-line">
                <span>Reported memory</span>
                <span>{formatValue(browserInfo.deviceMemory, " GB")}</span>
              </div>
              <div className="info-line">
                <span>Platform</span>
                <span>{formatValue(browserInfo.platform)}</span>
              </div>
              <div className="info-line">
                <span>Language</span>
                <span>{formatValue(browserInfo.language)}</span>
              </div>
              <p className="note">
                Browser metrics may be capped by privacy settings. Host values
                are more reliable.
              </p>

              <div className="recommendation">
                <div>
                  <p className="label">Recommended buffer</p>
                  <p className="big">
                    {recommendation.buffer
                      ? `${recommendation.buffer}s`
                      : "pending"}
                  </p>
                  <p className="muted">Source: {recommendation.source}</p>
                </div>
                <p className="muted">{recommendation.rationale}</p>
              </div>

              <div className="info-line">
                <span>Backend status</span>
                <span>{backendInfo ? "connected" : "offline"}</span>
              </div>
              {backendError && <p className="muted">{backendError}</p>}
            </div>
          </section>
        </aside>

        <section className="panel visual">
          <div className="figure">
            <div className="figure-header">
              <span className="figure-title">Audio spectrogram</span>
              <span className="figure-meta">live</span>
            </div>
            <div className="figure-controls">
              <span className="control-label">Display range (Hz)</span>
              <div className="freq-controls">
                <input
                  type="number"
                  min="0"
                  max={Math.round(nyquist)}
                  value={Math.round(freqRange.min)}
                  onChange={handleFreqMinChange}
                />
                <span className="control-sep">to</span>
                <input
                  type="number"
                  min="0"
                  max={Math.round(nyquist)}
                  value={Math.round(freqRange.max)}
                  onChange={handleFreqMaxChange}
                />
                <button type="button" className="ghost" onClick={setFullRange}>
                  Full
                </button>
              </div>
              <span className="control-hint">
                Nyquist: {formatHz(nyquist, true)}
              </span>
            </div>
            <div className="spectrogram-frame">
              <div className="freq-axis">
                {freqAxisLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <canvas
                ref={spectrogramRef}
                width={960}
                height={280}
                className="plot-canvas"
              />
            </div>
          </div>

          <div className="figure">
            <div className="figure-header">
              <span className="figure-title">FLAM output</span>
              <span className="figure-meta">energy proxy</span>
            </div>
            <div className="heatmap-wrap">
              <div className="heatmap-labels">
                {CATEGORY_BANDS.map((band) => (
                  <span key={band.label}>{band.label}</span>
                ))}
              </div>
              <canvas
                ref={heatmapRef}
                width={960}
                height={240}
                className="plot-canvas"
              />
              <div className="heatmap-scale">
                <div className="scale-gradient" />
                <div className="scale-labels">
                  <span>low</span>
                  <span>high</span>
                </div>
              </div>
            </div>
            <p className="figure-note muted">
              Placeholder mapping uses mic energy bands until FLAM inference is
              wired.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
