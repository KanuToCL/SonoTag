// =============================================================================
// WebcamModal — extracted from App.tsx
// =============================================================================

import { useRef, type RefObject, type MouseEvent as ReactMouseEvent } from "react";

export interface WebcamModalProps {
  show: boolean;
  visible: boolean;
  onToggleVisibility: () => void;
  onClose: () => void;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onDragStart: (e: ReactMouseEvent) => void;
  onResizeStart: (e: ReactMouseEvent) => void;
  webcamActive: boolean;
  webcamDevices: MediaDeviceInfo[];
  selectedWebcamId: string;
  onDeviceChange: (deviceId: string) => void;
  webcamError: string;
  webcamStreamRef: RefObject<MediaStream | null>;
  webcamRef: RefObject<HTMLVideoElement | null>;
}

export function WebcamModal({
  show,
  visible,
  onToggleVisibility,
  onClose,
  position,
  size,
  onDragStart,
  onResizeStart,
  webcamActive,
  webcamDevices,
  selectedWebcamId,
  onDeviceChange,
  webcamError,
  webcamStreamRef,
  webcamRef,
}: WebcamModalProps) {
  if (!show) return null;

  return (
    <div
      className="floating-video-modal floating-webcam-modal"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 500,
        background: "rgba(15, 20, 30, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        visibility: visible ? "visible" : "hidden",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease, visibility 0.2s ease",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Drag handle */}
      <div
        className="modal-drag-handle"
        onMouseDown={(e) => {
          onDragStart(e);
        }}
        style={{
          height: "28px",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          cursor: "grab",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
          Webcam
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "8px" }}>
          {webcamActive && (
            <span style={{ fontSize: "9px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--success)", animation: "pulse 2s ease infinite" }} />
              Live
            </span>
          )}
          {webcamDevices.length > 1 && (
            <select
              value={selectedWebcamId}
              onChange={(e) => {
                e.stopPropagation();
                onDeviceChange(e.target.value);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                padding: "2px 4px",
                fontSize: "9px",
                color: "var(--text)",
                cursor: "pointer",
                maxWidth: "100px",
              }}
            >
              {webcamDevices.map((device, index) => (
                <option key={device.deviceId || index} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onToggleVisibility}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "12px",
              padding: "2px 4px",
            }}
            title={visible ? "Hide" : "Show"}
          >
            {visible ? "−" : "+"}
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px 4px",
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Webcam video element */}
      <video
        ref={(el) => {
          (webcamRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
          if (el && webcamStreamRef.current && el.srcObject !== webcamStreamRef.current) {
            el.srcObject = webcamStreamRef.current;
          }
        }}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          flex: 1,
          background: "#000",
          display: "block",
          objectFit: "cover",
          transform: "scaleX(-1)",
        }}
      />

      {/* Webcam error display */}
      {webcamError && (
        <div style={{
          position: "absolute",
          bottom: "8px",
          left: "8px",
          right: "8px",
          padding: "6px 10px",
          background: "rgba(255, 107, 107, 0.9)",
          borderRadius: "4px",
          fontSize: "11px",
          color: "#fff",
        }}>
          {webcamError}
        </div>
      )}

      {/* Resize handle */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart(e);
        }}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "16px",
          height: "16px",
          cursor: "nwse-resize",
          background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%)",
        }}
      />
    </div>
  );
}
