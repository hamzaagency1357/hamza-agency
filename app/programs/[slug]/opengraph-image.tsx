import { ImageResponse } from "next/og";
import { PROGRAM_SLUGS } from "@/lib/i18n/publicLocales";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const logoUrl = "https://hamza-agency.com/Logo%20hamza%20agency.jpg";
const programNames: Record<string, string> = {
  tiktok: "TikTok",
  "bigo-live": "BIGO LIVE",
  yaahlan: "Yaahlan",
  xena: "Xena",
  catchii: "Catchii",
};

export default async function ProgramOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const safeSlug = PROGRAM_SLUGS.includes(
    slug as (typeof PROGRAM_SLUGS)[number]
  )
    ? slug
    : "tiktok";
  const programName = programNames[safeSlug];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "72px",
          padding: "86px",
          color: "white",
          background:
            "radial-gradient(circle at 18% 10%, rgba(124,58,237,.62), transparent 38%), radial-gradient(circle at 88% 72%, rgba(212,175,55,.28), transparent 36%), linear-gradient(135deg, #050008, #1a0730 52%, #050008)",
        }}
      >
        <img
          src={logoUrl}
          alt="HAMZA AGENCY"
          style={{
            width: "300px",
            height: "300px",
            borderRadius: "56px",
            objectFit: "cover",
            boxShadow: "0 0 88px rgba(168,85,247,.52)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "610px",
          }}
        >
          <div
            style={{
              color: "#d8b4fe",
              fontSize: "34px",
              fontWeight: 700,
              letterSpacing: "0.18em",
            }}
          >
            HAMZA AGENCY
          </div>
          <div
            style={{
              marginTop: "24px",
              fontSize: "82px",
              lineHeight: 1,
              fontWeight: 900,
            }}
          >
            {programName}
          </div>
          <div
            style={{
              marginTop: "30px",
              width: "280px",
              height: "7px",
              borderRadius: "999px",
              background:
                "linear-gradient(90deg, #9333ea, #d4af37)",
            }}
          />
        </div>
      </div>
    ),
    size
  );
}
