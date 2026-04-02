import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0c0f14",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            width: 80,
            height: 4,
            background: "#22d3ee",
            borderRadius: 2,
            marginBottom: 48,
          }}
        />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(34,211,238,0.12)",
              border: "2px solid rgba(34,211,238,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
              color: "#22d3ee",
            }}
          >
            N
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#22d3ee", letterSpacing: -1 }}>
            NiftyLens
          </span>
        </div>

        {/* Title — two lines using flex column */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#f1f5f9",
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            Indian Market Valuation Dashboard
          </span>
        </div>

        {/* Subtitle */}
        <div style={{ display: "flex", marginBottom: 48 }}>
          <span style={{ fontSize: 24, color: "#94a3b8" }}>
            26 years of Nifty 50 data — PE, PB, EPS, ERP &amp; composite score
          </span>
        </div>

        {/* Metric chips */}
        <div style={{ display: "flex", gap: 12 }}>
          {["PE Ratio", "PB Ratio", "EPS Growth", "Composite Score", "ERP", "India vs EM"].map(
            (label) => (
              <div
                key={label}
                style={{
                  background: "#13171e",
                  border: "1px solid #1e2535",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 18,
                  color: "#94a3b8",
                  display: "flex",
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* Bottom-right data note */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 48,
            right: 80,
            fontSize: 16,
            color: "#64748b",
          }}
        >
          NSE India · Yahoo Finance · AMFI · NSDL
        </div>
      </div>
    ),
    { ...size }
  );
}
