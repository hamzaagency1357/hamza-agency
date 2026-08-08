"use client";

import Image, { type ImageLoaderProps } from "next/image";
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

const DEFAULT_DESKTOP = "/media/cinematic/home-gateway-desktop.webp";
const DEFAULT_MOBILE = "/media/cinematic/home-gateway-mobile.webp";
const DEFAULT_POSTER = "/media/cinematic/home-gateway-poster.webp";
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

  const selected = media ? selectDeviceVisualSources(media, mobile) : { primary: null, fallback: null };
  const constrained = reducedMotion || saveData || weakDevice;
  const canPlayVideo = media?.fileType === "cinematic_video" && !videoFailed && Boolean(selected.primary) &&
    shouldPlayCinematic(media.autoplay, { reducedMotion, saveData, weakDevice });
  const managedImage = media?.fileType !== "cinematic_video" ? selected.primary : null;
  const managedPoster = media?.posterUrl || managedImage;
  const staticAsset = managedPoster || (mobile ? DEFAULT_MOBILE : DEFAULT_POSTER);
  const motionImage = managedImage || (mobile ? DEFAULT_MOBILE : DEFAULT_DESKTOP);
  const imageMotion = !canPlayVideo && !constrained && Boolean(motionImage);
  const mode = canPlayVideo ? "video" : imageMotion ? "layered-motion" : "poster";
  const focalPosition = media?.focalPosition || "center center";
  const blur = media?.blurPx ? `blur(${media.blurPx}px)` : undefined;
  const opacity = media?.opacity ?? 1;

  return (
    <div
      className="hamza-cinematic-site-background"
      aria-hidden="true"
      data-scope={scope}
      data-mode={mode}
      data-cinematic-motion={imageMotion || canPlayVideo ? "active" : "static"}
      data-cinematic-source={media ? "managed" : "built-in"}
    >
      <div className="hamza-cinematic-base" />

      {!media && (
        <picture className={`hamza-cinematic-picture ${imageMotion ? "is-moving" : "is-static"}`}>
          <source media="(max-width: 767px)" srcSet={DEFAULT_MOBILE} />
          <Image
            className="hamza-cinematic-scene-image"
            src={constrained ? DEFAULT_POSTER : DEFAULT_DESKTOP}
            alt=""
            fill
            priority
            sizes="100vw"
            loader={passthroughLoader}
            unoptimized
          />
        </picture>
      )}

      {media && !canPlayVideo && staticAsset && (
        <Image
          className={`hamza-cinematic-scene-image hamza-cinematic-managed-image ${imageMotion ? "is-moving" : "is-static"}`}
          src={imageMotion ? motionImage || staticAsset : staticAsset}
          alt=""
          fill
          sizes="100vw"
          loader={passthroughLoader}
          unoptimized
          style={{ objectPosition: focalPosition, filter: blur, opacity }}
          onError={(event) => {
            const image = event.currentTarget;
            const fallback = mobile ? DEFAULT_MOBILE : DEFAULT_POSTER;
            if (!image.src.endsWith(fallback)) image.src = fallback;
          }}
        />
      )}

      {canPlayVideo && media && selected.primary && (
        <>
          <Image
            className="hamza-cinematic-scene-image is-static hamza-cinematic-video-poster"
            src={staticAsset || DEFAULT_POSTER}
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
            poster={staticAsset || DEFAULT_POSTER}
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
      <div className="hamza-cinematic-dim" style={{ opacity: media?.dimming ?? .3 }} />
      <div className="hamza-cinematic-overlay" style={{ opacity: media?.overlayStrength ?? .38 }} />
      <div className="hamza-cinematic-vignette" />
    </div>
  );
}
