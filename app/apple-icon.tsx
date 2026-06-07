import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "42px",
          background:
            "radial-gradient(circle at 50% 20%, #7c3aed 0%, #16072a 44%, #050008 72%)",
          border: "6px solid rgba(212, 175, 55, 0.85)",
          color: "white",
          fontSize: 78,
          fontWeight: 900,
          letterSpacing: "-0.09em",
        }}
      >
        HA
      </div>
    ),
    size
  );
}
