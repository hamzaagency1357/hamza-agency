import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px",
          background:
            "radial-gradient(circle at 68% 18%, rgba(212,175,55,0.28) 0%, transparent 24%), radial-gradient(circle at 22% 18%, rgba(124,58,237,0.5) 0%, transparent 30%), linear-gradient(135deg, #050008 0%, #16072a 52%, #050008 100%)",
          color: "white",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            color: "#f5d77a",
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: "0.28em",
          }}
        >
          HAMZA AGENCY
        </div>

        <div
          style={{
            marginTop: 34,
            maxWidth: 860,
            fontSize: 74,
            lineHeight: 1.12,
            fontWeight: 900,
            textAlign: "right",
            direction: "rtl",
          }}
        >
          وكالة حمزة لإدارة وتطوير صناع المحتوى
        </div>

        <div
          style={{
            marginTop: 30,
            maxWidth: 820,
            color: "rgba(255,255,255,0.72)",
            fontSize: 30,
            lineHeight: 1.55,
            textAlign: "right",
            direction: "rtl",
          }}
        >
          منصة وكالة احترافية للتوظيف والدعم وإدارة المواهب على منصات البث المباشر.
        </div>

        <div
          style={{
            position: "absolute",
            right: 70,
            bottom: 58,
            padding: "16px 26px",
            borderRadius: 999,
            border: "1px solid rgba(212,175,55,0.45)",
            color: "#f5d77a",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          TikTok • BIGO LIVE • Yaahlan • Xena • Catchii
        </div>
      </div>
    ),
    size
  );
}
