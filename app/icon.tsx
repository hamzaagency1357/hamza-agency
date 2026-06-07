import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 64,
  height: 64,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "18px",
          background:
            "linear-gradient(135deg, #050008 0%, #2e1065 48%, #d4af37 100%)",
          color: "white",
          fontSize: 34,
          fontWeight: 900,
          letterSpacing: "-0.08em",
        }}
      >
        HA
      </div>
    ),
    size
  );
}
