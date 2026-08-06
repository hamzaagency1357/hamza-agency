import { ImageResponse } from "next/og";

export const runtime = "edge";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "linear-gradient(135deg, #09000f 0%, #220b3d 100%)", color: "white", alignItems: "center", justifyContent: "center", padding: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#f5d76e" }}>عراب سوريا</div>
          <div style={{ fontSize: 64, fontWeight: 900 }}>Blog · Identity · SEO</div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.8)" }}>Professional content and digital operations</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
