// =============================================================================
// AboutModal — extracted from App.tsx
// =============================================================================

interface AboutModalProps {
  show: boolean;
  onClose: () => void;
}

export function AboutModal({ show, onClose }: AboutModalProps) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />
      {/* Modal Card */}
      <div
        style={{
          position: "relative",
          width: "min(420px, 90vw)",
          maxHeight: "85vh",
          background: "rgba(15, 20, 30, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 16px 64px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
            About SonoTag
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "20px",
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "16px",
          }}
        >
          {/* App Info */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎧</div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--text)" }}>SonoTag</div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>Version 0.4.6</div>
          </div>

          <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

          {/* Developer */}
          <div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>Developed by</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>
              Sergio Peña
            </div>
            <a
              href="https://www.linkedin.com/in/sergio-pena-a8108684/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "var(--text)",
                fontSize: "13px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Connect on LinkedIn
            </a>
          </div>

          <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

          {/* Powered By */}
          <div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px" }}>Powered by</div>
            <div
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "12px",
                padding: "16px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>
                OpenFLAM
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "12px" }}>
                Frame-wise Language-Audio Modeling
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)", lineHeight: 1.5, textAlign: "left" }}>
                <strong>Citation:</strong><br />
                Wu, Y., Tsirigotis, C., Chen, K., Huang, C.A., Courville, A., Nieto, O., Seetharaman, P., & Salamon, J. (2025).
                <em> FLAM: Frame-Wise Language-Audio Modeling.</em> ICML 2025.
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  href="https://arxiv.org/abs/2505.05335"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "rgba(255, 122, 61, 0.15)",
                    border: "1px solid rgba(255, 122, 61, 0.3)",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  arXiv
                </a>
                <a
                  href="https://github.com/adobe-research/openflam"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "var(--text)",
                    textDecoration: "none",
                  }}
                >
                  GitHub
                </a>
                <a
                  href="https://flam-model.github.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "rgba(42, 209, 255, 0.15)",
                    border: "1px solid rgba(42, 209, 255, 0.3)",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "var(--accent-2)",
                    textDecoration: "none",
                  }}
                >
                  Website
                </a>
              </div>
            </div>
            <div style={{ fontSize: "9px", color: "var(--muted)", marginTop: "8px", opacity: 0.7 }}>
              ⚠️ OpenFLAM is licensed under Adobe Research License (non-commercial only)
            </div>
          </div>

          <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

          {/* Built With */}
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "10px" }}>
              Built as a fun experiment with
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px" }}>
              {["Claude Sonnet 4", "React", "FastAPI", "PyTorch"].map((tech) => (
                <span
                  key={tech}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "var(--muted)",
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

          {/* Copyright */}
          <div style={{ fontSize: "11px", color: "var(--muted)", opacity: 0.7 }}>
            © 2025 Sergio Peña. All rights reserved.
          </div>

          <div style={{ height: "1px", width: "60%", background: "rgba(255, 255, 255, 0.1)" }} />

          {/* Other Apps */}
          <div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px" }}>
              Try my other apps
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <a
                href="https://www.geonoise.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "var(--text)",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              >
                🌍 GeoNoise
              </a>
              <a
                href="https://www.cellcraft.dev"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "var(--text)",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              >
                🧬 Cellcraft
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
