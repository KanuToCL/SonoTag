// =============================================================================
// StatsModal — extracted from App.tsx
// =============================================================================

import { useState, type MouseEvent as ReactMouseEvent } from "react";

export interface StatsModalProps {
  show: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onDragStart: (e: ReactMouseEvent) => void;
  scoreHistory: Record<string, number[]>;
  topRankedHistory: string[];
  sessionStartTime: number | null;
  totalInferences: number;
  promptsCount: number;
  tableSortBy: "median" | "peak";
  setTableSortBy: (v: "median" | "peak") => void;
  onReset: () => void;
}

export function StatsModal({
  show,
  onClose,
  position,
  onDragStart,
  scoreHistory,
  topRankedHistory,
  sessionStartTime,
  totalInferences,
  promptsCount,
  tableSortBy,
  setTableSortBy,
  onReset,
}: StatsModalProps) {
  const [hoveredCdfLabel, setHoveredCdfLabel] = useState<string | null>(null);
  const [hoveredCdfPos, setHoveredCdfPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredHistogramBin, setHoveredHistogramBin] = useState<{ count: number; x: number; y: number } | null>(null);

  if (!show) return null;

  return (
    <div
      className="floating-video-modal floating-stats-modal"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        width: 420,
        maxHeight: "80vh",
        zIndex: 502,
        background: "rgba(15, 20, 30, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "12px",
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
          height: "32px",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          cursor: "grab",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500 }}>
          Cumulative Statistics
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onReset}
            style={{
              background: "rgba(255, 100, 100, 0.2)",
              border: "1px solid rgba(255, 100, 100, 0.3)",
              borderRadius: "4px",
              color: "#ff6b6b",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 8px",
            }}
            title="Reset statistics"
          >
            Reset
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
              fontSize: "16px",
              padding: "2px 4px",
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Stats content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}>
        {/* Session Summary */}
        <div style={{
          background: "rgba(0, 0, 0, 0.3)",
          borderRadius: "8px",
          padding: "12px",
        }}>
          <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Session Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--accent)" }}>
                {totalInferences}
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Inferences</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--accent-2)" }}>
                {sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0}s
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Duration</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--success)" }}>
                {promptsCount}
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted)", textTransform: "uppercase" }}>Labels</div>
            </div>
        </div>
      </div>

        {/* Top-Ranked Over Time */}
        {topRankedHistory.length > 0 && (
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                Top-Ranked Count Over Time
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                n={topRankedHistory.length}
              </div>
            </div>
            <div style={{ position: "relative", height: "120px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}>
              {(() => {
                const colors = ["#ff7a3d", "#2ad1ff", "#5ce3a2", "#ff6b6b", "#a78bfa", "#fbbf24"];

                const runningCounts: Record<string, number> = {};
                const timeSeriesData: Array<Record<string, number>> = [];

                topRankedHistory.forEach((winningLabel) => {
                  runningCounts[winningLabel] = (runningCounts[winningLabel] || 0) + 1;
                  timeSeriesData.push({ ...runningCounts });
                });

                const finalCounts = timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1] : {};
                const top6Labels = Object.entries(finalCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([label]) => label);

                const maxCount = Math.max(...Object.values(finalCounts).map(Number), 1);
                const totalSteps = topRankedHistory.length;

                return (
                  <>
                    <svg
                      key={`top-ranked-${topRankedHistory.length}`}
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                      <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                      {top6Labels.map((label, idx) => {
                        const points = timeSeriesData.map((snapshot, i) => {
                          const count = snapshot[label] || 0;
                          const x = totalSteps > 1 ? (i / (totalSteps - 1)) * 100 : 50;
                          const y = 100 - (count / maxCount) * 100;
                          return `${x},${y}`;
                        }).join(" ");

                        return (
                          <polyline
                            key={`${label}-${totalSteps}`}
                            points={points}
                            fill="none"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        );
                      })}
                    </svg>
                    <div style={{ position: "absolute", top: "4px", left: "4px", fontSize: "8px", color: "var(--muted)" }}>
                      {maxCount}
                    </div>
                    <div style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "8px", color: "var(--muted)" }}>
                      0
                    </div>
                  </>
                );
              })()}
              <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "var(--muted)" }}>
                <span>start</span>
                <span>time</span>
                <span>now</span>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px", marginTop: "8px" }}>
              {(() => {
                const colors = ["#ff7a3d", "#2ad1ff", "#5ce3a2", "#ff6b6b", "#a78bfa", "#fbbf24"];
                const labelCounts: Record<string, number> = {};
                topRankedHistory.forEach((label) => {
                  labelCounts[label] = (labelCounts[label] || 0) + 1;
                });

                return Object.entries(labelCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([label, count], idx) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: colors[idx % colors.length], flexShrink: 0 }} />
                      <span style={{ fontSize: "9px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {label.length > 10 ? `${label.slice(0, 10)}...` : label} ({count})
                      </span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}

        {/* CDF Distribution - hidden for now */}
        {false && Object.keys(scoreHistory).length > 0 && (
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                Score Distribution (CDF)
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                n={totalInferences}
              </div>
            </div>
            <div style={{ position: "relative", height: "120px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}>
              <svg
                key={`cdf-${totalInferences}`}
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <line x1="25" y1="0" x2="25" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                {(() => {
                  const colors = ["#ff7a3d", "#2ad1ff", "#5ce3a2", "#ff6b6b", "#a78bfa"];
                  const labelTopCounts: Record<string, number> = {};
                  topRankedHistory.forEach((label) => {
                    labelTopCounts[label] = (labelTopCounts[label] || 0) + 1;
                  });

                  const topLabels = Object.entries(scoreHistory)
                    .map(([label, scores]) => ({ label, scores, topCount: labelTopCounts[label] || 0 }))
                    .sort((a, b) => b.topCount - a.topCount)
                    .slice(0, 5);

                  return topLabels.map(({ label, scores }, idx) => {
                    const sorted = [...scores].sort((a, b) => a - b);
                    const points = [];
                    for (let i = 0; i <= 20; i++) {
                      const threshold = i / 20;
                      const countBelow = sorted.filter(s => s <= threshold).length;
                      const cdf = countBelow / sorted.length;
                      points.push(`${threshold * 100},${100 - cdf * 100}`);
                    }
                    return (
                      <polyline
                        key={`${label}-${scores.length}`}
                        points={points.join(" ")}
                        fill="none"
                        stroke={colors[idx % colors.length]}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  });
                })()}
              </svg>
              <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "8px", color: "var(--muted)" }}>
                <span>0</span>
                <span>0.25</span>
                <span>0.5</span>
                <span>0.75</span>
                <span>1.0</span>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
              {(() => {
                const colors = ["#ff7a3d", "#2ad1ff", "#5ce3a2", "#ff6b6b", "#a78bfa"];
                const labelTopCounts: Record<string, number> = {};
                topRankedHistory.forEach((label) => {
                  labelTopCounts[label] = (labelTopCounts[label] || 0) + 1;
                });

                return Object.entries(scoreHistory)
                  .map(([label]) => ({ label, topCount: labelTopCounts[label] || 0 }))
                  .sort((a, b) => b.topCount - a.topCount)
                  .slice(0, 5)
                  .map(({ label }, idx) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: colors[idx % colors.length] }} />
                      <span style={{ fontSize: "9px", color: "var(--muted)" }}>{label.length > 12 ? `${label.slice(0, 12)}...` : label}</span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        )}

        {/* PDF - Probability Density of Median Scores */}
        {Object.keys(scoreHistory).length > 0 && (
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", color: "#ff7a3d", textTransform: "uppercase", letterSpacing: "1px" }}>
                PDF (Median Density)
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                {Object.keys(scoreHistory).length} labels
              </div>
            </div>
            <div style={{ position: "relative", height: "80px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}>
              {(() => {
                const medians = Object.entries(scoreHistory).map(([label, scores]) => {
                  const sorted = [...scores].sort((a, b) => a - b);
                  const median = sorted[Math.floor(sorted.length / 2)] || 0;
                  return { label, median };
                });

                const numBins = 20;
                const bins: number[] = new Array(numBins).fill(0);
                medians.forEach(({ median }) => {
                  const binIdx = Math.min(Math.floor(median * numBins), numBins - 1);
                  bins[binIdx]++;
                });

                const maxBin = Math.max(...bins, 1);

                return (
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
                    {bins.map((count, i) => {
                      const x = (i / numBins) * 100;
                      const width = 100 / numBins - 0.5;
                      const h = (count / maxBin) * 90;
                      return (
                        <rect
                          key={i}
                          x={x}
                          y={100 - h}
                          width={width}
                          height={h}
                          fill="rgba(255, 122, 61, 0.6)"
                          stroke="#ff7a3d"
                          strokeWidth="0.5"
                        />
                      );
                    })}
                  </svg>
                );
              })()}
              <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "var(--muted)" }}>
                <span>0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>
          </div>
        )}

        {/* CDF - Cumulative Distribution of Median Scores */}
        {Object.keys(scoreHistory).length > 0 && (
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", color: "#2ad1ff", textTransform: "uppercase", letterSpacing: "1px" }}>
                CDF (Cumulative Distribution)
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                {Object.keys(scoreHistory).length} labels
              </div>
            </div>
            <div
              style={{ position: "relative", height: "80px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}
              onMouseLeave={() => { setHoveredCdfLabel(null); setHoveredCdfPos(null); }}
            >
              {(() => {
                const medians = Object.entries(scoreHistory).map(([label, scores]) => {
                  const sorted = [...scores].sort((a, b) => a - b);
                  const median = sorted[Math.floor(sorted.length / 2)] || 0;
                  return { label, median };
                }).sort((a, b) => a.median - b.median);

                const getPointColor = (median: number) => {
                  if (median < 0.33) return "#ff6b6b";
                  if (median < 0.66) return "#fbbf24";
                  return "#5ce3a2";
                };

                const cdfPoints = medians.map((m, i) => ({
                  x: m.median * 100,
                  y: 100 - ((i + 1) / medians.length) * 90,
                  label: m.label,
                  median: m.median,
                }));

                const linePath = cdfPoints.length > 0
                  ? `M 0,100 L ${cdfPoints.map(p => `${p.x},${p.y}`).join(" L ")} L 100,${cdfPoints[cdfPoints.length - 1]?.y || 10}`
                  : "";

                return (
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ cursor: "crosshair" }}
                  >
                    <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
                    <path d={`${linePath} L 100,100 L 0,100 Z`} fill="rgba(42, 209, 255, 0.15)" />
                    <path d={linePath} fill="none" stroke="#2ad1ff" strokeWidth="1.5" strokeLinecap="round" />
                    {cdfPoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredCdfLabel === p.label ? "4" : "2"}
                        fill={getPointColor(p.median)}
                        stroke={hoveredCdfLabel === p.label ? "#fff" : "rgba(0,0,0,0.5)"}
                        strokeWidth={hoveredCdfLabel === p.label ? "1" : "0.3"}
                        style={{ cursor: "pointer", transition: "r 0.1s, stroke-width 0.1s" }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                          if (rect) {
                            setHoveredCdfLabel(p.label);
                            setHoveredCdfPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                          }
                        }}
                      />
                    ))}
                  </svg>
                );
              })()}
              {hoveredCdfLabel && hoveredCdfPos && (
                <div style={{
                  position: "absolute",
                  left: `${Math.min(hoveredCdfPos.x + 10, 200)}px`,
                  top: `${Math.max(hoveredCdfPos.y - 20, 4)}px`,
                  background: "rgba(0, 0, 0, 0.85)",
                  padding: "3px 6px",
                  borderRadius: "3px",
                  fontSize: "8px",
                  color: "#fff",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                  zIndex: 10,
                }}>
                  {hoveredCdfLabel.length > 25 ? `${hoveredCdfLabel.slice(0, 25)}...` : hoveredCdfLabel}
                </div>
              )}
              <div style={{ position: "absolute", top: "2px", left: "4px", fontSize: "7px", color: "var(--muted)" }}>100%</div>
              <div style={{ position: "absolute", bottom: "2px", left: "4px", fontSize: "7px", color: "var(--muted)" }}>0%</div>
              <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "var(--muted)" }}>
                <span>0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>
          </div>
        )}

        {/* Histogram - All Scores Distribution */}
        {Object.keys(scoreHistory).length > 0 && (
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", color: "#5ce3a2", textTransform: "uppercase", letterSpacing: "1px" }}>
                Score Histogram (All Scores)
              </div>
              <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                n={Object.values(scoreHistory).flat().length}
              </div>
            </div>
            <div
              style={{ position: "relative", height: "80px", background: "rgba(0, 0, 0, 0.3)", borderRadius: "4px", padding: "8px" }}
              onMouseLeave={() => setHoveredHistogramBin(null)}
            >
              {(() => {
                const allScores = Object.values(scoreHistory).flat();
                const numBins = 25;
                const bins: number[] = new Array(numBins).fill(0);
                allScores.forEach((score) => {
                  const binIdx = Math.min(Math.floor(score * numBins), numBins - 1);
                  bins[binIdx]++;
                });

                const maxBin = Math.max(...bins, 1);

                return (
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ cursor: "crosshair" }}>
                    <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
                    {bins.map((count, i) => {
                      const x = (i / numBins) * 100;
                      const width = 100 / numBins - 0.3;
                      const h = (count / maxBin) * 90;
                      const intensity = i / numBins;
                      const color = intensity < 0.33 ? "rgba(255, 107, 107, 0.7)" : intensity < 0.66 ? "rgba(251, 191, 36, 0.7)" : "rgba(92, 227, 162, 0.7)";
                      return (
                        <rect
                          key={i}
                          x={x}
                          y={100 - h}
                          width={width}
                          height={Math.max(h, 2)}
                          fill={color}
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="0.3"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                            if (rect) {
                              setHoveredHistogramBin({ count, x: e.clientX - rect.left, y: e.clientY - rect.top });
                            }
                          }}
                        />
                      );
                    })}
                  </svg>
                );
              })()}
              {hoveredHistogramBin && hoveredHistogramBin.count > 0 && (
                <div style={{
                  position: "absolute",
                  left: hoveredHistogramBin.x > 200 ? `${hoveredHistogramBin.x - 28}px` : `${hoveredHistogramBin.x + 8}px`,
                  top: `${Math.max(hoveredHistogramBin.y - 16, 4)}px`,
                  background: "rgba(0, 0, 0, 0.85)",
                  padding: "2px 5px",
                  borderRadius: "3px",
                  fontSize: "8px",
                  color: "#fff",
                  pointerEvents: "none",
                  zIndex: 10,
                }}>
                  {hoveredHistogramBin.count}
                </div>
              )}
              <div style={{ position: "absolute", bottom: "-2px", left: "8px", right: "8px", display: "flex", justifyContent: "space-between", fontSize: "7px", color: "var(--muted)" }}>
                <span>0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>
          </div>
        )}

        {/* Label Gauges - Peak & Median */}
        {Object.keys(scoreHistory).length > 0 && (
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                All Labels (Peak / Median)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ display: "flex", gap: "2px", fontSize: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setTableSortBy("median")}
                    style={{
                      padding: "2px 6px",
                      background: tableSortBy === "median" ? "var(--accent)" : "rgba(255, 255, 255, 0.1)",
                      color: tableSortBy === "median" ? "#fff" : "var(--muted)",
                      border: "none",
                      borderRadius: "3px 0 0 3px",
                      cursor: "pointer",
                      fontSize: "8px",
                    }}
                  >
                    Median
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableSortBy("peak")}
                    style={{
                      padding: "2px 6px",
                      background: tableSortBy === "peak" ? "var(--accent)" : "rgba(255, 255, 255, 0.1)",
                      color: tableSortBy === "peak" ? "#fff" : "var(--muted)",
                      border: "none",
                      borderRadius: "0 3px 3px 0",
                      cursor: "pointer",
                      fontSize: "8px",
                    }}
                  >
                    Peak
                  </button>
                </div>
                <div style={{ fontSize: "9px", color: "var(--muted)" }}>
                  {Object.keys(scoreHistory).length}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
              {(() => {
                const stats = Object.entries(scoreHistory).map(([label, scores]) => {
                  const peak = Math.max(...scores);
                  const sorted = [...scores].sort((a, b) => a - b);
                  const median = sorted[Math.floor(sorted.length / 2)] || 0;
                  return { label, peak, median, count: scores.length };
                }).sort((a, b) => tableSortBy === "median" ? b.median - a.median : b.peak - a.peak);

                return stats.map(({ label, peak, median, count }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "90px", fontSize: "9px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>
                      {label.length > 12 ? `${label.slice(0, 12)}...` : label}
                    </div>
                    <div style={{ flex: 1, height: "10px", background: "rgba(0, 0, 0, 0.4)", borderRadius: "5px", overflow: "hidden", position: "relative" }}>
                      <div style={{
                        width: `${Math.max(0, Math.min(100, peak * 100))}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, ${median < 0.33 ? "#ff6b6b" : median < 0.66 ? "#fbbf24" : "#5ce3a2"}, ${peak < 0.33 ? "#ff6b6b" : peak < 0.66 ? "#fbbf24" : "#5ce3a2"})`,
                        borderRadius: "5px",
                        opacity: 0.7,
                      }} />
                      <div style={{
                        position: "absolute",
                        left: `${Math.max(0, Math.min(97, median * 100))}%`,
                        top: 0,
                        bottom: 0,
                        width: "2px",
                        background: "#fff",
                        boxShadow: "0 0 4px rgba(0,0,0,0.5)",
                      }} />
                    </div>
                    <div style={{ width: "70px", fontSize: "8px", color: "var(--muted)", textAlign: "right", fontFamily: "monospace" }}>
                      {peak.toFixed(2)} / {median.toFixed(2)}
                    </div>
                    <div style={{ width: "30px", fontSize: "7px", color: "var(--muted)", textAlign: "right" }}>
                      ({count})
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Empty state */}
        {Object.keys(scoreHistory).length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--muted)",
          }}>
            <div style={{ fontSize: "24px", marginBottom: "12px", color: "var(--muted)" }}>No data yet</div>
            <div style={{ fontSize: "10px", marginTop: "4px" }}>Start analyzing audio to see cumulative statistics</div>
          </div>
        )}
      </div>
    </div>
  );
}
