"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  resolveSiteVisualScope,
  selectDeviceVisualSources,
  shouldPlayCinematic,
  type PublicSiteVisualMedia,
} from "@/lib/siteVisualMedia";

type PublicVisualResponse = { media: PublicSiteVisualMedia | null; compatible: boolean };
type NetworkInformationLike = { saveData?: boolean };
type NavigatorWithHints = Navigator & { connection?: NetworkInformationLike; deviceMemory?: number };

function inferVideoType(url: string | null) {
  if (!url) return undefined;
  const clean = url.split(/[?#]/, 1)[0].toLowerCase();
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".mp4") || clean.endsWith(".m4v")) return "video/mp4";
  return undefined;
}
function backgroundImage(url: string | null) {
  if (!url) return undefined;
  return `url(${JSON.stringify(url)})`;
}

export default function CinematicSiteBackground() {
  const pathname = usePathname() || "/";
  const scope = useMemo(() => resolveSiteVisualScope(pathname), [pathname]);
  const [media, setMedia] = useState<PublicSiteVisualMedia | null>(null);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [weakDevice, setWeakDevice] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const requestedScope = scope;
    if (!requestedScope) {
      setMedia(null);
      return;
    }
    let current = true;
    const controller = new AbortController();
    async function loadMedia() {
      try {
        const response = await fetch(
          `/api/public/site-visual?scope=${encodeURIComponent(requestedScope)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } }
        );
        if (!response.ok) return;
        const payload = (await response.json()) as PublicVisualResponse;
        if (current) {
          setVideoFailed(false);
          setMedia(payload.media || null);
        }
      } catch {
        if (current) setMedia(null);
      }
    }
    void loadMedia();
    return () => { current = false; controller.abort(); };
  }, [scope]);

  useEffect(() => {
    if (!scope) return;
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const hints = navigator as NavigatorWithHints;
      const cores = navigator.hardwareConcurrency || 0;
      const memory = hints.deviceMemory || 0;
      setMobile(mobileQuery.matches);
      setReducedMotion(reducedMotionQuery.matches);
      setSaveData(hints.connection?.saveData === true);
      setWeakDevice((cores > 0 && cores <= 2) || (memory > 0 && memory <= 2));
    };
    update();
    mobileQuery.addEventListener("change", update);
    reducedMotionQuery.addEventListener("change", update);
    return () => {
      mobileQuery.removeEventListener("change", update);
      reducedMotionQuery.removeEventListener("change", update);
    };
  }, [scope]);

  useEffect(() => {
    const root = document.documentElement;
    if (media) root.dataset.cinematicMedia = "active";
    else delete root.dataset.cinematicMedia;
    return () => { delete root.dataset.cinematicMedia; };
  }, [media]);

  if (!scope) return null;
  const selected = media ? selectDeviceVisualSources(media, mobile) : { primary: null, fallback: null };
  const canPlay = media?.fileType === "cinematic_video" && !videoFailed && Boolean(selected.primary) &&
    shouldPlayCinematic(media.autoplay, { reducedMotion, saveData, weakDevice });
  const staticAsset = !saveData && !weakDevice
    ? media?.posterUrl || (media?.fileType !== "cinematic_video" ? selected.primary : null)
    : null;

  return (
    <div className="hamza-cinematic-site-background" aria-hidden="true" data-scope={scope} data-mode={canPlay ? "video" : staticAsset ? "poster" : "fallback"}>
      <div className="hamza-cinematic-base" />
      {staticAsset && <div className="hamza-cinematic-poster" style={{
        backgroundImage: backgroundImage(staticAsset), backgroundPosition: media?.focalPosition || "center center",
        filter: media?.blurPx ? `blur(${media.blurPx}px)` : undefined, opacity: media?.opacity ?? 1,
      }} />}
      {canPlay && media && selected.primary && (
        <video key={`${scope}-${mobile ? "mobile" : "desktop"}-${selected.primary}`} className="hamza-cinematic-video"
          muted autoPlay loop={media.loop} playsInline preload="metadata" poster={media.posterUrl || undefined}
          onError={() => setVideoFailed(true)}
          style={{ objectPosition: media.focalPosition, filter: media.blurPx ? `blur(${media.blurPx}px)` : undefined, opacity: media.opacity }}>
          <source src={selected.primary} type={inferVideoType(selected.primary)} />
          {selected.fallback && selected.fallback !== selected.primary && <source src={selected.fallback} type={inferVideoType(selected.fallback)} />}
        </video>
      )}
      <div className="hamza-cinematic-dim" style={{ opacity: media?.dimming ?? .34 }} />
      <div className="hamza-cinematic-overlay" style={{ opacity: media?.overlayStrength ?? .42 }} />
      <div className="hamza-cinematic-vignette" />
    </div>
  );
}
