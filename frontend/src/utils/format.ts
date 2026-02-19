export const formatValue = (
  value: string | number | null | undefined,
  suffix?: string
): string => {
  if (value === null || value === undefined || value === "") {
    return "unknown";
  }
  return `${value}${suffix || ""}`;
};

export const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes || Number.isNaN(bytes)) {
    return "unknown";
  }
  const gb = bytes / 1024 / 1024 / 1024;
  return `${gb.toFixed(1)} GB`;
};

export const formatHz = (value: number, withUnit = false): string => {
  if (!Number.isFinite(value)) {
    return "--";
  }
  if (value >= 1000) {
    const rounded = Math.round(value / 100) / 10;
    return withUnit ? `${rounded} kHz` : `${rounded}k`;
  }
  return withUnit ? `${Math.round(value)} Hz` : `${Math.round(value)}`;
};
