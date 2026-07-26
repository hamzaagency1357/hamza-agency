import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const logoUrl = "https://hamza-agency.com/Logo%20hamza%20agency.jpg";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 18%, rgba(124,58,237,0.38) 0%, transparent 30%), radial-gradient(circle at 74% 28%, rgba(212,175,55,0.22) 0%, transparent 28%), linear-gradient(135deg, #050008 0%, #16072a 50%, #050008 100%)",
        }}
      >
        <div
          style={{
            width: "420px",
            height: "420px",
            display: "flex",
            borderRadius: "64px",
            overflow: "hidden",
            boxShadow: "0 0 90px rgba(124,58,237,0.55)",
          }}
        >
          <img
            src={logoUrl}
            alt="HAMZA AGENCY"
            style={{
              width: "420px",
              height: "420px",
              objectFit: "cover",
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
