import { NextResponse, type NextRequest } from "next/server";

type MaintenanceSetting = {
  setting_key: string | null;
  setting_value: string | null;
};

const maintenanceSettingKeys = [
  "maintenance_mode",
  "maintenance_mode_enabled",
  "maintenance_message_ar",
  "maintenance_mode_message",
  "maintenance_mode_whatsapp_enabled",
  "primary_whatsapp",
  "support_whatsapp",
  "agency_name_ar",
  "agency_name_en",
  "site_name",
];

const publicAssetPattern = /\.(?:css|js|map|png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|webmanifest|woff|woff2|ttf|otf)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldSkipMaintenanceCheck(pathname)) {
    return NextResponse.next();
  }

  const maintenance = await getMaintenanceSettings();

  if (!maintenance.enabled) {
    return NextResponse.next();
  }

  return new NextResponse(
    renderMaintenanceHtml({
      agencyName: maintenance.agencyName,
      message: maintenance.message,
      whatsapp: maintenance.whatsapp,
      showWhatsapp: maintenance.showWhatsapp,
    }),
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
        "retry-after": "900",
      },
    }
  );
}

function shouldSkipMaintenanceCheck(pathname: string) {
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;
  if (pathname === "/manifest.webmanifest") return true;
  if (publicAssetPattern.test(pathname)) return true;
  return false;
}

async function getMaintenanceSettings() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const fallback = {
    enabled: false,
    message: "الموقع قيد الصيانة حالياً، يرجى المحاولة لاحقاً.",
    whatsapp: "+905011730377",
    showWhatsapp: true,
    agencyName: "وكالة حمزة",
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return fallback;
  }

  try {
    const url = new URL("/rest/v1/settings", supabaseUrl);
    url.searchParams.set("select", "setting_key,setting_value");
    url.searchParams.set("setting_key", `in.(${maintenanceSettingKeys.join(",")})`);

    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return fallback;
    }

    const settings = (await response.json()) as MaintenanceSetting[];
    const getSetting = (keys: string[], defaultValue: string) => {
      for (const key of keys) {
        const value = settings.find((item) => item.setting_key === key)?.setting_value;
        if (value && value.trim()) return value.trim();
      }
      return defaultValue;
    };

    return {
      enabled: isTruthy(getSetting(["maintenance_mode", "maintenance_mode_enabled"], "false")),
      message: getSetting(
        ["maintenance_message_ar", "maintenance_mode_message"],
        fallback.message
      ),
      whatsapp: getSetting(["primary_whatsapp", "support_whatsapp"], fallback.whatsapp),
      showWhatsapp: isTruthy(getSetting(["maintenance_mode_whatsapp_enabled"], "true")),
      agencyName: getSetting(["agency_name_ar", "site_name", "agency_name_en"], fallback.agencyName),
    };
  } catch {
    return fallback;
  }
}

function isTruthy(value: string) {
  return ["true", "1", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
}

function renderMaintenanceHtml({
  agencyName,
  message,
  whatsapp,
  showWhatsapp,
}: {
  agencyName: string;
  message: string;
  whatsapp: string;
  showWhatsapp: boolean;
}) {
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const whatsappHref = `https://wa.me/${cleanWhatsapp}`;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(agencyName)} | وضع الصيانة</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Arial, Tahoma, sans-serif;
      color: #fff;
      background:
        radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.42), transparent 48%),
        radial-gradient(circle at 10% 70%, rgba(212, 175, 55, 0.13), transparent 34%),
        linear-gradient(180deg, #170726 0%, #070009 62%, #000 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: min(720px, 100%);
      border: 1px solid rgba(168, 85, 247, 0.26);
      background: rgba(0, 0, 0, 0.38);
      box-shadow: 0 0 90px rgba(124, 58, 237, 0.22);
      border-radius: 34px;
      padding: 34px;
      text-align: center;
      backdrop-filter: blur(18px);
    }
    .badge {
      display: inline-flex;
      border: 1px solid rgba(212, 175, 55, 0.34);
      color: #fde68a;
      background: rgba(212, 175, 55, 0.10);
      padding: 10px 18px;
      border-radius: 999px;
      font-weight: 700;
      margin-bottom: 22px;
    }
    h1 {
      margin: 0;
      font-size: clamp(34px, 8vw, 64px);
      line-height: 1.25;
      letter-spacing: -0.03em;
    }
    .highlight {
      color: #f5d76e;
    }
    p {
      margin: 22px auto 0;
      max-width: 560px;
      color: rgba(255, 255, 255, 0.72);
      line-height: 2;
      font-size: 18px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      margin-top: 30px;
    }
    a, button {
      border: 0;
      text-decoration: none;
      color: #fff;
      border-radius: 999px;
      padding: 14px 24px;
      font-weight: 800;
      font-size: 15px;
      cursor: pointer;
    }
    a {
      background: #22c55e;
    }
    button {
      background: linear-gradient(90deg, #7c3aed, #d946ef);
    }
    .note {
      margin-top: 26px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.42);
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">${escapeHtml(agencyName)}</div>
    <h1>الموقع قيد <span class="highlight">الصيانة</span></h1>
    <p>${escapeHtml(message)}</p>
    <div class="actions">
      ${showWhatsapp ? `<a href="${whatsappHref}" target="_blank" rel="noreferrer">تواصل واتساب</a>` : ""}
      <button type="button" onclick="window.location.reload()">تحديث الصفحة</button>
    </div>
    <div class="note">تستطيع إدارة وضع الصيانة من لوحة تحكم وكالة حمزة.</div>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
