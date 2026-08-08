import { NextRequest, NextResponse } from "next/server";
import {
  clampVisualNumber,
  resolveSiteVisualScope,
  type PublicSiteVisualMedia,
  type SiteVisualMediaKind,
} from "@/lib/siteVisualMedia";

export const dynamic = "force-dynamic";

type MediaRow = {
  name: string | null;
  file_url: string | null;
  file_type: string | null;
  page_slug: string | null;
  usage_context: string | null;
  desktop_url: string | null;
  desktop_fallback_url: string | null;
  mobile_url: string | null;
  mobile_fallback_url: string | null;
  poster_url: string | null;
  alt_text: string | null;
  opacity: number | string | null;
  dimming: number | string | null;
  overlay_strength: number | string | null;
  blur_px: number | string | null;
  focal_position: string | null;
  autoplay: boolean | null;
  loop: boolean | null;
};

const PUBLIC_FIELDS = [
  "name",
  "file_url",
  "file_type",
  "page_slug",
  "usage_context",
  "desktop_url",
  "desktop_fallback_url",
  "mobile_url",
  "mobile_fallback_url",
  "poster_url",
  "alt_text",
  "opacity",
  "dimming",
  "overlay_strength",
  "blur_px",
  "focal_position",
  "autoplay",
  "loop",
].join(",");

const PUBLIC_TYPES = new Set<SiteVisualMediaKind>([
  "cinematic_video",
  "background_image",
  "texture",
]);

function safeAssetUrl(value: string | null | undefined) {
  const url = value?.trim();
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function normalizeRow(row: MediaRow): PublicSiteVisualMedia | null {
  const scope = resolveSiteVisualScope(row.page_slug);
  const fileType = row.file_type as SiteVisualMediaKind;

  if (!scope || !PUBLIC_TYPES.has(fileType)) return null;

  const desktopUrl = safeAssetUrl(row.desktop_url) || safeAssetUrl(row.file_url);
  const mobileUrl = safeAssetUrl(row.mobile_url);
  const posterUrl = safeAssetUrl(row.poster_url);
  const desktopFallbackUrl = safeAssetUrl(row.desktop_fallback_url);
  const mobileFallbackUrl = safeAssetUrl(row.mobile_fallback_url);

  if (!desktopUrl && !mobileUrl && !posterUrl) return null;

  return {
    name: row.name?.trim() || "HAMZA AGENCY visual",
    pageSlug: scope,
    fileType,
    usageContext: row.usage_context?.trim() || "background",
    desktopUrl,
    desktopFallbackUrl,
    mobileUrl,
    mobileFallbackUrl,
    posterUrl,
    altText: row.alt_text?.trim() || "",
    opacity: clampVisualNumber(row.opacity, 0, 1, 1),
    dimming: clampVisualNumber(row.dimming, 0, 1, 0.38),
    overlayStrength: clampVisualNumber(row.overlay_strength, 0, 1, 0.48),
    blurPx: Math.round(clampVisualNumber(row.blur_px, 0, 24, 0)),
    focalPosition: row.focal_position?.trim() || "center center",
    autoplay: row.autoplay !== false,
    loop: row.loop !== false,
  };
}

function emptyResponse(compatible = true) {
  return NextResponse.json(
    { media: null, compatible },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const scope = resolveSiteVisualScope(
    request.nextUrl.searchParams.get("path") ||
      request.nextUrl.searchParams.get("scope")
  );

  if (!scope) return emptyResponse();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !anonKey) return emptyResponse(false);

  const endpoint = new URL(`${supabaseUrl}/rest/v1/media`);
  endpoint.searchParams.set("select", PUBLIC_FIELDS);
  endpoint.searchParams.set("page_slug", `eq.${scope}`);
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("status", "eq.published");
  endpoint.searchParams.set(
    "file_type",
    "in.(cinematic_video,background_image,texture)"
  );
  endpoint.searchParams.set("order", "updated_at.desc");
  endpoint.searchParams.set("limit", "1");

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      // Preview remains usable before the additive PR5 migration reaches the
      // database. No raw database errors are sent to visitors.
      return emptyResponse(false);
    }

    const rows = (await response.json()) as MediaRow[];
    const media = rows.length > 0 ? normalizeRow(rows[0]) : null;

    return NextResponse.json(
      { media, compatible: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return emptyResponse(false);
  }
}
