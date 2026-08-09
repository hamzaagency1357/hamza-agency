import { NextResponse, type NextRequest } from "next/server";
import {
  isSiteLanguage,
  SITE_LANGUAGE_STORAGE_KEY,
  type SiteLanguage,
} from "@/lib/i18n/locale";
import {
  languageHomepage,
  parseAcceptLanguageHeader,
  resolveFirstVisitLanguage,
} from "@/lib/i18n/firstVisitLanguage.mjs";
import {
  isSupportedPublicPath,
  splitLocalizedPathname,
} from "@/lib/i18n/publicLocales";

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
  const forwardedLanguage = request.headers.get("x-site-locale");
  const forwardedPath = request.headers.get("x-site-path");

  if (
    isSiteLanguage(forwardedLanguage) &&
    forwardedPath &&
    forwardedPath !== pathname
  ) {
    return NextResponse.next({
      request: { headers: new Headers(request.headers) },
    });
  }

  const firstVisitResponse = resolveFirstVisitRedirect(request);
  if (firstVisitResponse) return firstVisitResponse;

  const localizedPath = splitLocalizedPathname(pathname);
  const hasLocalePrefix = localizedPath.language !== "ar";
  const publicPath = localizedPath.publicPath;

  if (hasLocalePrefix && !isSupportedPublicPath(publicPath)) {
    const fallbackUrl = request.nextUrl.clone();
    fallbackUrl.pathname = `/${localizedPath.language}`;
    fallbackUrl.search = "";
    return NextResponse.redirect(fallbackUrl);
  }

  const language = localizedPath.language;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-site-locale", language);
  requestHeaders.set("x-site-path", pathname);

  if (shouldSkipMaintenanceCheck(publicPath)) {
    return createLocalizedResponse({
      request,
      requestHeaders,
      publicPath,
      language,
      shouldRewrite: hasLocalePrefix,
    });
  }

  const maintenance = await getMaintenanceSettings();

  if (!maintenance.enabled) {
    return createLocalizedResponse({
      request,
      requestHeaders,
      publicPath,
      language,
      shouldRewrite: hasLocalePrefix,
    });
  }

  return new NextResponse(
    renderMaintenanceHtml({
      language,
      agencyName:
        language === "ar" ? maintenance.agencyName : "HAMZA AGENCY",
      message: language === "ar" ? maintenance.message : undefined,
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

function shouldPersistLanguagePreference(request: NextRequest) {
  if (request.method !== "GET") return false;

  const headers = request.headers;
  const purpose = `${headers.get("purpose") || ""} ${headers.get("sec-purpose") || ""}`.toLowerCase();

  if (
    headers.get("next-router-prefetch") === "1" ||
    headers.get("x-middleware-prefetch") === "1" ||
    purpose.includes("prefetch") ||
    headers.get("rsc") === "1" ||
    headers.has("next-router-state-tree") ||
    headers.has("next-router-segment-prefetch")
  ) {
    return false;
  }

  const fetchMode = headers.get("sec-fetch-mode");
  const fetchDestination = headers.get("sec-fetch-dest");

  if (fetchMode || fetchDestination) {
    return fetchMode === "navigate" && fetchDestination === "document";
  }

  return (headers.get("accept") || "").toLowerCase().includes("text/html");
}

function resolveFirstVisitRedirect(request: NextRequest) {
  if (!shouldPersistLanguagePreference(request)) return null;
  if (request.nextUrl.pathname !== "/") return null;

  const savedLanguage =
    request.cookies.get(SITE_LANGUAGE_STORAGE_KEY)?.value || null;
  const language = resolveFirstVisitLanguage({
    pathname: request.nextUrl.pathname,
    savedLanguage,
    navigatorLanguages: parseAcceptLanguageHeader(
      request.headers.get("accept-language") || ""
    ),
    userAgent: request.headers.get("user-agent") || "",
  });

  if (language !== "en" && language !== "tr") return null;

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = languageHomepage(language);
  const response = NextResponse.redirect(redirectUrl, 307);
  response.cookies.set(SITE_LANGUAGE_STORAGE_KEY, language, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}

function createLocalizedResponse({
  request,
  requestHeaders,
  publicPath,
  language,
  shouldRewrite,
}: {
  request: NextRequest;
  requestHeaders: Headers;
  publicPath: string;
  language: SiteLanguage;
  shouldRewrite: boolean;
}) {
  const response = shouldRewrite
    ? NextResponse.rewrite(
        new URL(`${publicPath}${request.nextUrl.search}`, request.url),
        { request: { headers: requestHeaders } }
      )
    : NextResponse.next({ request: { headers: requestHeaders } });

  if (
    isSupportedPublicPath(publicPath) &&
    shouldPersistLanguagePreference(request)
  ) {
    response.cookies.set(SITE_LANGUAGE_STORAGE_KEY, language, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
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
    agencyName: "HAMZA AGENCY",
  };

  if (!supabaseUrl || !supabaseAnonKey) return fallback;

  try {
    const url = new URL("/rest/v1/settings", supabaseUrl);
    url.searchParams.set("select", "setting_key,setting_value");
    url.searchParams.set(
      "setting_key",
      `in.(${maintenanceSettingKeys.join(",")})`
    );

    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) return fallback;

    const settings = (await response.json()) as MaintenanceSetting[];
    const getSetting = (keys: string[], defaultValue: string) => {
      for (const key of keys) {
        const value = settings.find(
          (item) => item.setting_key === key
        )?.setting_value;
        if (value?.trim()) return value.trim();
      }
      return defaultValue;
    };

    return {
      enabled: isTruthy(
        getSetting(
          ["maintenance_mode", "maintenance_mode_enabled"],
          "false"
        )
      ),
      message: getSetting(
        ["maintenance_message_ar", "maintenance_mode_message"],
        fallback.message
      ),
      whatsapp: getSetting(
        ["primary_whatsapp", "support_whatsapp"],
        fallback.whatsapp
      ),
      showWhatsapp: isTruthy(
        getSetting(["maintenance_mode_whatsapp_enabled"], "true")
      ),
      agencyName: getSetting(
        ["agency_name_ar", "site_name", "agency_name_en"],
        fallback.agencyName
      ),
    };
  } catch {
    return fallback;
  }
}

function isTruthy(value: string) {
  return ["true", "1", "yes", "on", "enabled"].includes(
    value.trim().toLowerCase()
  );
}

function renderMaintenanceHtml({
  language,
  agencyName,
  message,
  whatsapp,
  showWhatsapp,
}: {
  language: SiteLanguage;
  agencyName: string;
  message?: string;
  whatsapp: string;
  showWhatsapp: boolean;
}) {
  const copy = {
    ar: {
      title: "وضع الصيانة",
      headingBefore: "الموقع قيد",
      headingHighlight: "الصيانة",
      message: "نعمل حالياً على تحسين الموقع. يرجى المحاولة مرة أخرى قريباً.",
      whatsapp: "تواصل واتساب",
      refresh: "تحديث الصفحة",
      note: "تتم إدارة وضع الصيانة بأمان من لوحة تحكم HAMZA AGENCY.",
    },
    en: {
      title: "Maintenance",
      headingBefore: "The website is under",
      headingHighlight: "maintenance",
      message: "We are currently improving the website. Please try again shortly.",
      whatsapp: "Contact on WhatsApp",
      refresh: "Refresh page",
      note: "Maintenance mode is managed securely through HAMZA AGENCY.",
    },
    tr: {
      title: "Bakım",
      headingBefore: "Web sitesi şu anda",
      headingHighlight: "bakımda",
      message: "Web sitesini geliştiriyoruz. Lütfen kısa süre sonra tekrar deneyin.",
      whatsapp: "WhatsApp ile İletişim",
      refresh: "Sayfayı yenile",
      note: "Bakım modu HAMZA AGENCY tarafından güvenli biçimde yönetilir.",
    },
  }[language];
  const direction = language === "ar" ? "rtl" : "ltr";
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const whatsappHref = `https://wa.me/${cleanWhatsapp}`;

  return `<!doctype html>
<html lang="${language}" dir="${direction}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(agencyName)} | ${escapeHtml(copy.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; font-family: Arial, Tahoma, sans-serif; color: #fff; background: radial-gradient(circle at 50% 0%, rgba(124,58,237,.42), transparent 48%), radial-gradient(circle at 10% 70%, rgba(212,175,55,.13), transparent 34%), linear-gradient(180deg,#170726 0%,#070009 62%,#000 100%); display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { width: min(720px,100%); border: 1px solid rgba(168,85,247,.26); background: rgba(0,0,0,.38); box-shadow: 0 0 90px rgba(124,58,237,.22); border-radius: 34px; padding: 34px; text-align: center; backdrop-filter: blur(18px); }
    .badge { display: inline-flex; border: 1px solid rgba(212,175,55,.34); color: #fde68a; background: rgba(212,175,55,.10); padding: 10px 18px; border-radius: 999px; font-weight: 700; margin-bottom: 22px; }
    h1 { margin: 0; font-size: clamp(34px,8vw,64px); line-height: 1.25; letter-spacing: -.03em; }
    .highlight { color: #f5d76e; }
    p { margin: 22px auto 0; max-width: 560px; color: rgba(255,255,255,.72); line-height: 2; font-size: 18px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 30px; }
    a, button { border: 0; text-decoration: none; color: #fff; border-radius: 999px; padding: 14px 24px; font-weight: 800; font-size: 15px; cursor: pointer; }
    a { background: #22c55e; } button { background: linear-gradient(90deg,#7c3aed,#d946ef); }
    .note { margin-top: 26px; font-size: 13px; color: rgba(255,255,255,.42); }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">${escapeHtml(agencyName)}</div>
    <h1>${escapeHtml(copy.headingBefore)} <span class="highlight">${escapeHtml(copy.headingHighlight)}</span></h1>
    <p>${escapeHtml(message || copy.message)}</p>
    <div class="actions">
      ${showWhatsapp ? `<a href="${whatsappHref}" target="_blank" rel="noreferrer">${escapeHtml(copy.whatsapp)}</a>` : ""}
      <button type="button" onclick="window.location.reload()">${escapeHtml(copy.refresh)}</button>
    </div>
    <div class="note">${escapeHtml(copy.note)}</div>
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};