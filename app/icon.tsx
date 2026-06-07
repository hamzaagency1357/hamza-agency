import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 64,
  height: 64,
};
export const contentType = "image/png";

const logoUrl = "https://hamza-agency.vercel.app/Logo%20hamza%20agency.jpg";

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
          background: "#050008",
        }}
      >
        <img
          src={logoUrl}
          alt="HAMZA AGENCY"
          style={{
            width: "64px",
            height: "64px",
            objectFit: "cover",
          }}
        />
      </div>
    ),
    size
  );
}
