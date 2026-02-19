/**
 * Collapsible section header component for Classic view
 */
export const CollapsibleHeader = ({
  title,
  isCollapsed,
  onToggle,
}: {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      background: "transparent",
      border: "none",
      padding: 0,
      cursor: "pointer",
      color: "inherit",
    }}
  >
    <h2 style={{ margin: 0 }}>{title}</h2>
    <span
      style={{
        fontSize: "12px",
        color: "var(--muted)",
        transition: "transform 0.2s ease",
        transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
      }}
    >
      ▼
    </span>
  </button>
);
