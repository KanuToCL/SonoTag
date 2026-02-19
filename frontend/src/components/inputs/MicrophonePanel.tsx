import type { PermissionState } from "../../types/app";

export interface MicrophonePanelProps {
  permissionState: PermissionState;
  error: string;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSetSelectedDeviceId: (id: string) => void;
  onRequestPermission: () => Promise<boolean>;
  onRefreshDevices: () => Promise<void>;
  onStartMonitoring: () => Promise<void>;
  onStopMonitoring: () => Promise<void>;
  webcamActive: boolean;
  onStartWebcam: () => void;
  onStopWebcam: () => void;
  levelPercent: number;
}

export function MicrophonePanel({
  permissionState,
  error,
  devices,
  selectedDeviceId,
  onSetSelectedDeviceId,
  onRequestPermission,
  onRefreshDevices,
  onStartMonitoring,
  onStopMonitoring,
  webcamActive,
  onStartWebcam,
  onStopWebcam,
  levelPercent,
}: MicrophonePanelProps) {
  return (
    <section className="block">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: 0 }}>Microphone Capture</h2>
        <button
          type="button"
          onClick={() => {
            if (webcamActive) {
              onStopWebcam();
            } else {
              onStartWebcam();
            }
          }}
          style={{
            padding: "6px 12px",
            background: webcamActive ? "rgba(255, 122, 61, 0.2)" : "rgba(15, 21, 32, 0.8)",
            border: "1px solid",
            borderColor: webcamActive ? "var(--accent)" : "rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            color: webcamActive ? "var(--accent)" : "var(--muted)",
            cursor: "pointer",
            fontSize: "12px",
            transition: "all 0.2s ease",
          }}
          title={webcamActive ? "Stop Webcam" : "Start Webcam"}
        >
          {webcamActive ? "Stop Camera" : "Camera"}
        </button>
      </div>
      <div className="stack">
        <label className="label" htmlFor="device-select">
          Microphone
        </label>
        <select
          id="device-select"
          value={selectedDeviceId}
          onChange={(event) => onSetSelectedDeviceId(event.target.value)}
        >
          {devices.length === 0 && <option>No devices found</option>}
          {devices.map((device, index) => (
            <option key={device.deviceId || index} value={device.deviceId}>
              {device.label || `Mic ${index + 1}`}
            </option>
          ))}
        </select>
        <div className="row">
          <button type="button" onClick={onRequestPermission}>
            Request access
          </button>
          <button
            type="button"
            onClick={onRefreshDevices}
            className="ghost"
          >
            Refresh devices
          </button>
        </div>
        <div className="row">
          <button type="button" onClick={onStartMonitoring}>
            Start monitoring
          </button>
          <button type="button" onClick={onStopMonitoring} className="ghost">
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
  );
}
