import { describe, expect, it } from "vitest";
import {
  clampVisualNumber,
  resolveSiteVisualScope,
  selectDeviceVisualSources,
  shouldPlayCinematic,
  type PublicSiteVisualMedia,
} from "@/lib/siteVisualMedia";

const media: PublicSiteVisualMedia = {
  name: "Home cinematic", pageSlug: "home", fileType: "cinematic_video", usageContext: "background",
  desktopUrl: "https://cdn.example.com/desktop.webm", desktopFallbackUrl: "https://cdn.example.com/desktop.mp4",
  mobileUrl: "https://cdn.example.com/mobile.webm", mobileFallbackUrl: "https://cdn.example.com/mobile.mp4",
  posterUrl: "https://cdn.example.com/poster.webp", altText: "", opacity: 1, dimming: .35,
  overlayStrength: .48, blurPx: 0, focalPosition: "center center", autoplay: true, loop: true,
};

describe("PR5 site visual routing", () => {
  it("maps AR EN TR routes to one scope", () => {
    expect(resolveSiteVisualScope("/")).toBe("home");
    expect(resolveSiteVisualScope("/en")).toBe("home");
    expect(resolveSiteVisualScope("/tr/")).toBe("home");
    expect(resolveSiteVisualScope("/en/programs?ref=nav")).toBe("programs");
    expect(resolveSiteVisualScope("/tr/services#top")).toBe("services");
    expect(resolveSiteVisualScope("/application-status")).toBe("application-status");
  });
  it("excludes admin and unknown paths", () => {
    expect(resolveSiteVisualScope("/admin")).toBeNull();
    expect(resolveSiteVisualScope("/admin/media/cinematic")).toBeNull();
    expect(resolveSiteVisualScope("/unknown")).toBeNull();
  });
});

describe("PR5 playback guardrails", () => {
  it("plays only on unconstrained devices", () => {
    expect(shouldPlayCinematic(true, { reducedMotion: false, saveData: false, weakDevice: false })).toBe(true);
    expect(shouldPlayCinematic(true, { reducedMotion: true, saveData: false, weakDevice: false })).toBe(false);
    expect(shouldPlayCinematic(true, { reducedMotion: false, saveData: true, weakDevice: false })).toBe(false);
    expect(shouldPlayCinematic(true, { reducedMotion: false, saveData: false, weakDevice: true })).toBe(false);
  });
});

describe("PR5 device sources", () => {
  it("selects only the needed device source set", () => {
    expect(selectDeviceVisualSources(media, false)).toEqual({ primary: media.desktopUrl, fallback: media.desktopFallbackUrl });
    expect(selectDeviceVisualSources(media, true)).toEqual({ primary: media.mobileUrl, fallback: media.mobileFallbackUrl });
    const inherited = { ...media, mobileUrl: null, mobileFallbackUrl: null };
    expect(selectDeviceVisualSources(inherited, true)).toEqual({ primary: media.desktopUrl, fallback: media.desktopFallbackUrl });
  });
});

describe("PR5 numeric safety", () => {
  it("clamps layout-sensitive values", () => {
    expect(clampVisualNumber(2, 0, 1, .5)).toBe(1);
    expect(clampVisualNumber(-1, 0, 1, .5)).toBe(0);
    expect(clampVisualNumber("0.4", 0, 1, .5)).toBe(.4);
    expect(clampVisualNumber("invalid", 0, 1, .5)).toBe(.5);
  });
});
