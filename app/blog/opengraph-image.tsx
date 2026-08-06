import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HAMZA AGENCY — Arab Syria Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "radial-gradient(circle at 20% 20%, rgba(245,215,110,0.25), transparent 32%), linear-gradient(135deg, #09000f 0%, #220b3d 100%)", color: "white", alignItems: "center", justifyContent: "center", padding: 72 }}>
      <div style={{ display: "flex", width: "100%", flexDirection: "column", gap: 22, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 40, padding: 56, background: "rgba(0,0,0,0.28)" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: "#f5d76e", letterSpacing: 4 }}>HAMZA AGENCY</div>
        <div style={{ display: "flex", fontSize: 74, fontWeight: 900, lineHeight: 1.05 }}>Arab Syria Blog</div>
        <div style={{ display: "flex", fontSize: 28, color: "rgba(255,255,255,0.78)" }}>Creators · Live Streaming · Digital Identity</div>
      </div>
    </div>,
    size
  );
}
