import type { BackendInfo, BrowserInfo, Recommendation } from "../types";
import { formatValue, formatBytes } from "../utils/format";
import { CollapsibleHeader } from "./CollapsibleHeader";

export interface SystemSnapshotProps {
  isCollapsed: boolean;
  onToggle: () => void;
  backendInfo: BackendInfo | null;
  backendError: string;
  browserInfo: BrowserInfo;
  recommendation: Recommendation;
  sampleRate: number | null;
}

export function SystemSnapshot({
  isCollapsed,
  onToggle,
  backendInfo,
  backendError,
  browserInfo,
  recommendation,
  sampleRate,
}: SystemSnapshotProps) {
  const hostCpuLogical = backendInfo?.cpu?.logical_cores ?? backendInfo?.cpu_count ?? null;
  const hostCpuPhysical = backendInfo?.cpu?.physical_cores ?? null;
  const hostCpuModel = backendInfo?.cpu?.model ?? null;
  const hostMemoryBytes = backendInfo?.memory?.total_bytes ?? null;
  const hostPlatform = backendInfo?.platform ?? null;
  const hostGpus = backendInfo?.gpus ?? [];

  return (
    <section className="block">
      <CollapsibleHeader
        title="System snapshot"
        isCollapsed={isCollapsed}
        onToggle={onToggle}
      />
      {!isCollapsed && (
        <div className="stack" style={{ marginTop: "14px" }}>
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
                  {gpu?.memory_bytes ? ` (${formatBytes(gpu.memory_bytes)})` : ""}
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
                {recommendation.buffer ? `${recommendation.buffer}s` : "pending"}
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
      )}
    </section>
  );
}
