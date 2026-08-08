"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  resolveSiteVisualScope,
  selectDeviceVisualSources,
  shouldPlayCinematic,
  type PublicSiteVisualMedia,
  type SiteVisualScope,
} from "@/lib/siteVisualMedia";

type PublicVisualResponse = { media: PublicSiteVisualMedia | null; compatible: boolean };
type NetworkInformationLike = { saveData?: boolean };
type NavigatorWithHints = Navigator & { connection?: NetworkInformationLike; deviceMemory?: number };

const HOME_DESKTOP_WEBM = "/media/cinematic/home-cinematic-desktop.webm";
const HOME_DESKTOP_MP4 = "/media/cinematic/home-cinematic-desktop.mp4";
const HOME_MOBILE_WEBM = "/media/cinematic/home-cinematic-mobile.webm";
const HOME_MOBILE_MP4 = "/media/cinematic/home-cinematic-mobile.mp4";
const HOME_DESKTOP_POSTER = "/media/cinematic/home-cinematic-desktop-poster.webp";
const HOME_MOBILE_POSTER = "/media/cinematic/home-cinematic-mobile-poster.webp";

const PAGE_VISUALS: Partial<Record<SiteVisualScope, string>> = {
  programs: "/media/cinematic/programs.webp",
  services: "/media/cinematic/services.webp",
  "success-stories": "/media/cinematic/success-stories.webp",
  blog: "/media/cinematic/blog.webp",
  agent: "/media/cinematic/agent.webp",
  contact: "/media/cinematic/contact.webp",
  "install-app": "/media/cinematic/install-app.webp",
  tracking: "/media/cinematic/tracking.webp",
  "service-request": "/media/cinematic/service-request.webp",
  "application-status": "/media/cinematic/application-status.webp",
  "service-status": "/media/cinematic/service-status.webp",
};

const passthroughLoader = ({ src }: ImageLoaderProps) => src;

function inferVideoType(url: string | null) {
  if (!url) return undefined;
  const clean = url.split(/[?#]/, 1)[0].toLowerCase();
  if (clean.endsWith(".webm")) return "video/webm";
  if (clean.endsWith(".mp4") || clean.endsWith(".m4v")) return "video/mp4";
  return undefined;
}

export default function CinematicSiteBackground() {
  const pathname = usePathname() || "/";
  const scope = useMemo(() => resolveSiteVisualScope(pathname), [pathname]);
  const [media, setMedia] = useState<PublicSiteVisualMedia | null>(null);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [weakDevice, setWeakDevice] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const requestedScope = scope ?? "";
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
    if (scope) root.dataset.cinematicMedia = "active";
    else delete root.dataset.cinematicMedia;
    return () => { delete root.dataset.cinematicMedia; };
  }, [scope]);

  if (!scope) return null;

  const constrained = reducedMotion || saveData || weakDevice;
  const selected = media ? selectDeviceVisualSources(media, mobile) : { primary: null, fallback: null };
  const canPlayManagedVideo = media?.fileType === "cinematic_video" && !videoFailed && Boolean(selected.primary) &&
    shouldPlayCinematic(media.autoplay, { reducedMotion, saveData, weakDevice });
  const canPlayBuiltInHomeVideo = !media && scope === "home" && !videoFailed && !constrained;
  const managedImage = media?.fileType !== "cinematic_video" ? selected.primary : null;
  const managedPoster = media?.posterUrl || managedImage;
  const builtInPoster = mobile ? HOME_MOBILE_POSTER : HOME_DESKTOP_POSTER;
  const pageVisual = PAGE_VISUALS[scope] || builtInPoster;
  const staticAsset = managedPoster || (scope === "home" ? builtInPoster : pageVisual);
  const managedImageMotion = Boolean(media && managedImage && !constrained);
  const mode = canPlayManagedVideo || canPlayBuiltInHomeVideo ? "video" : managedImageMotion ? "layered-motion" : "poster";
  const focalPosition = media?.focalPosition || "center center";
  const blur = media?.blurPx ? `blur(${media.blurPx}px)` : undefined;
  const opacity = media?.opacity ?? 1;
  const defaultDimming = scope === "home" ? 0.14 : 0.24;
  const defaultOverlay = scope === "home" ? 0.2 : 0.3;

  return (
    <div
      className="hamza-cinematic-site-background"
      aria-hidden="true"
      data-scope={scope}
      data-mode={mode}
      data-cinematic-motion={canPlayManagedVideo || canPlayBuiltInHomeVideo || managedImageMotion ? "active" : "static"}
      data-cinematic-source={media ? "managed" : "built-in"}
    >
      <div className="hamza-cinematic-base" />

      {!media && scope === "home" && (
        <>
          <Image
            className="hamza-cinematic-scene-image is-static hamza-cinematic-video-poster"
            src={builtInPoster}
            alt=""
            fill
            priority
            sizes="100vw"
            loader={passthroughLoader}
            unoptimized
          />
          {canPlayBuiltInHomeVideo && (
            <video
              className="hamza-cinematic-video"
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              poster={builtInPoster}
              onError={() => setVideoFailed(true)}
            >
              <source media="(max-width: 767px)" src={HOME_MOBILE_WEBM} type="video/webm" />
              <source media="(max-width: 767px)" src={HOME_MOBILE_MP4} type="video/mp4" />
              <source src={HOME_DESKTOP_WEBM} type="video/webm" />
              <source src={HOME_DESKTOP_MP4} type="video/mp4" />
            </video>
          )}
        </>
      )}

      {!media && scope !== "home" && pageVisual && (
        <Image
          className="hamza-cinematic-scene-image is-static hamza-cinematic-page-visual"
          src={pageVisual}
          alt=""
          fill
          sizes="100vw"
          loader={passthroughLoader}
          unoptimized
        />
      )}

      {media && !canPlayManagedVideo && staticAsset && (
        <Image
          className={`hamza-cinematic-scene-image hamza-cinematic-managed-image ${managedImageMotion ? "is-moving" : "is-static"}`}
          src={managedImageMotion ? managedImage || staticAsset : staticAsset}
          alt=""
          fill
          sizes="100vw"
          loader={passthroughLoader}
          unoptimized
          style={{ objectPosition: focalPosition, filter: blur, opacity }}
          onError={(event) => {
            const image = event.currentTarget;
            if (!image.src.endsWith(builtInPoster)) image.src = builtInPoster;
          }}
        />
      )}

      {canPlayManagedVideo && media && selected.primary && (
        <>
          <Image
            className="hamza-cinematic-scene-image is-static hamza-cinematic-video-poster"
            src={staticAsset || builtInPoster}
            alt=""
            fill
            sizes="100vw"
            loader={passthroughLoader}
            unoptimized
          />
          <video
            key={`${scope}-${mobile ? "mobile" : "desktop"}-${selected.primary}`}
            className="hamza-cinematic-video"
            muted
            autoPlay
            loop={media.loop}
            playsInline
            preload="metadata"
            poster={staticAsset || builtInPoster}
            onError={() => setVideoFailed(true)}
            style={{ objectPosition: focalPosition, filter: blur, opacity }}
          >
            <source src={selected.primary} type={inferVideoType(selected.primary)} />
            {selected.fallback && selected.fallback !== selected.primary && <source src={selected.fallback} type={inferVideoType(selected.fallback)} />}
          </video>
        </>
      )}

      <div className="hamza-cinematic-depth hamza-cinematic-depth-far" />
      <div className="hamza-cinematic-depth hamza-cinematic-depth-mid" />
      <div className="hamza-cinematic-light-sweep" />
      <div className="hamza-cinematic-dim" style={{ opacity: media?.dimming ?? defaultDimming }} />
      <div className="hamza-cinematic-overlay" style={{ opacity: media?.overlayStrength ?? defaultOverlay }} />
      <div className="hamza-cinematic-vignette" />
    </div>
  );
}
