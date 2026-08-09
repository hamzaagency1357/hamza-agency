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

type PublicVisualResponse = {
  media: PublicSiteVisualMedia | null;
  compatible: boolean;
};

type NetworkInformationLike = { saveData?: boolean };
type NavigatorWithHints = Navigator & {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
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
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [weakDevice, setWeakDevice] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (!scope) {
      setMedia(null);
      return;
    }

    let current = true;
    const controller = new AbortController();

    async function loadMedia() {
      try {
        const response = await fetch(
          `/api/public/site-visual?scope=${encodeURIComponent(scope)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } }
        );
        if (!response.ok) {
          if (current) setMedia(null);
          return;
        }
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
    return () => {
      current = false;
      controller.abort();
    };
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

    return () => {
      delete root.dataset.cinematicMedia;
    };
  }, [media]);

  // No published managed media means the existing site background remains untouched.
  if (!scope || !media) return null;

  const selected = selectDeviceVisualSources(media, mobile);
  const isVideo = media.fileType === "cinematic_video";
  const canPlayVideo =
    isVideo &&
    !videoFailed &&
    Boolean(selected.primary) &&
    shouldPlayCinematic(media.autoplay, { reducedMotion, saveData, weakDevice });

  const imageSource = !isVideo ? selected.primary : null;
  const poster = media.posterUrl || imageSource;
  const focalPosition = media.focalPosition || "center center";
  const blur = media.blurPx ? `blur(${media.blurPx}px)` : undefined;
  const opacity = media.opacity ?? 1;
  const mode = canPlayVideo ? "video" : imageSource ? "image" : "poster";

  if (!canPlayVideo && !imageSource && !poster) return null;

  return (
    <div
      className="hamza-cinematic-site-background"
      aria-hidden="true"
      data-scope={scope}
      data-mode={mode}
      data-cinematic-motion={canPlayVideo ? "active" : "static"}
      data-cinematic-source="managed"
    >
      {poster && (
        <Image
          className="hamza-cinematic-scene-image is-static hamza-cinematic-video-poster"
          src={poster}
          alt=""
          fill
          sizes="100vw"
          loader={passthroughLoader}
          unoptimized
          style={{ objectPosition: focalPosition, filter: blur, opacity }}
        />
      )}

      {imageSource && !canPlayVideo && (
        <Image
          className="hamza-cinematic-scene-image is-static hamza-cinematic-managed-image"
          src={imageSource}
          alt=""
          fill
          sizes="100vw"
          loader={passthroughLoader}
          unoptimized
          style={{ objectPosition: focalPosition, filter: blur, opacity }}
        />
      )}

      {canPlayVideo && selected.primary && (
        <video
          key={`${scope}-${mobile ? "mobile" : "desktop"}-${selected.primary}`}
          className="hamza-cinematic-video"
          muted
          autoPlay
          loop={media.loop}
          playsInline
          preload="metadata"
          poster={poster || undefined}
          onError={() => setVideoFailed(true)}
          style={{ objectPosition: focalPosition, filter: blur, opacity }}
        >
          <source src={selected.primary} type={inferVideoType(selected.primary)} />
          {selected.fallback && selected.fallback !== selected.primary && (
            <source src={selected.fallback} type={inferVideoType(selected.fallback)} />
          )}
        </video>
      )}

      <div className="hamza-cinematic-dim" style={{ opacity: media.dimming ?? 0.1 }} />
      <div className="hamza-cinematic-overlay" style={{ opacity: media.overlayStrength ?? 0.14 }} />
      <div className="hamza-cinematic-vignette" />
    </div>
  );
}
