"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isSupportedPublicPath } from "@/lib/i18n/publicLocales";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  DEFAULT_VISUAL_BACKGROUND_PRESET,
  normalizeVisualBackgroundPreset,
  VISUAL_BACKGROUND_PRESET_CLASSES,
  type VisualBackgroundPresetId,
} from "@/lib/visualBackgroundPresets";

const PUBLIC_PRESET_CACHE_KEY = "hamza_visual_background_preset";

type PublicVisualSettings = {
  background: string | null;
  motion: string | null;
  glow: boolean | null;
};

export default function VisualBackgroundPresets() {
  const pathname = usePathname() || "/";
  const [activePreset, setActivePreset] =
    useState<VisualBackgroundPresetId>(
      DEFAULT_VISUAL_BACKGROUND_PRESET
    );
  const [motion, setMotion] = useState("medium");
  const [glow, setGlow] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    async function loadPublicPreset() {
      if (!isSupabaseConfigured || !supabase) {
        setActivePreset(DEFAULT_VISUAL_BACKGROUND_PRESET);
        return;
      }

      const { data, error } = await supabase
        .from("visual_experience_settings")
        .select("background, motion, glow")
        .eq("apply_to_public", true)
        .eq("status", "approved")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!isCurrent) return;

      if (!error && data) {
        const settings = data as PublicVisualSettings;
        const preset = normalizeVisualBackgroundPreset(
          settings.background
        );
        setActivePreset(preset);
        setMotion(
          settings.motion === "low" || settings.motion === "high"
            ? settings.motion
            : "medium"
        );
        setGlow(settings.glow !== false);
        window.localStorage.setItem(PUBLIC_PRESET_CACHE_KEY, preset);
        return;
      }

      if (!error && !data) {
        setActivePreset(DEFAULT_VISUAL_BACKGROUND_PRESET);
        setMotion("medium");
        setGlow(true);
        window.localStorage.removeItem(PUBLIC_PRESET_CACHE_KEY);
        return;
      }

      const cached = window.localStorage.getItem(
        PUBLIC_PRESET_CACHE_KEY
      );
      if (cached) {
        setActivePreset(normalizeVisualBackgroundPreset(cached));
      }
    }

    void loadPublicPreset();
    return () => {
      isCurrent = false;
    };
  }, []);

  if (!isSupportedPublicPath(pathname)) return null;

  const presetClassName =
    VISUAL_BACKGROUND_PRESET_CLASSES[activePreset];

  return (
    <>
      <div
        aria-hidden="true"
        className={`hamza-visual-background-presets ${presetClassName}`}
        data-background-preset={activePreset}
        data-motion={motion}
        data-glow={glow ? "on" : "off"}
      >
        <div className="hvb-base" />
        <div className="hvb-orb hvb-orb-one" />
        <div className="hvb-orb hvb-orb-two" />
        <div className="hvb-orb hvb-orb-three" />
        <div className="hvb-orb hvb-orb-four" />
        <div className="hvb-silk hvb-silk-one" />
        <div className="hvb-silk hvb-silk-two" />
        <div className="hvb-silk hvb-silk-three" />
        <div className="hvb-gold-line hvb-gold-line-one" />
        <div className="hvb-gold-line hvb-gold-line-two" />
        <div className="hvb-gold-line hvb-gold-line-three" />
        <div className="hvb-network" />
        <div className="hvb-signal hvb-signal-one" />
        <div className="hvb-signal hvb-signal-two" />
        <div className="hvb-texture" />
        <div className="hvb-vignette" />
      </div>

      <style>{`
        .hamza-visual-background-presets {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
          isolation: isolate;
          opacity: 1;
        }

        .hamza-visual-background-presets * {
          position: absolute;
          will-change: transform, opacity;
        }

        .hamza-visual-background-presets[data-motion="low"] * {
          animation-duration: 30s !important;
        }

        .hamza-visual-background-presets[data-motion="high"] * {
          animation-duration: 10s !important;
        }

        .hamza-visual-background-presets[data-glow="off"] .hvb-orb,
        .hamza-visual-background-presets[data-glow="off"] .hvb-silk {
          opacity: 0.15 !important;
        }

        .hvb-base {
          inset: 0;
          background:
            radial-gradient(circle at 50% 12%, rgba(181, 90, 255, 0.3), transparent 42%),
            radial-gradient(circle at 20% 36%, rgba(124, 58, 237, 0.22), transparent 36%),
            radial-gradient(circle at 82% 32%, rgba(212, 175, 55, 0.14), transparent 34%),
            linear-gradient(180deg, rgba(25, 3, 52, 0.35), rgba(4, 0, 10, 0.82));
          animation: hvbBaseBreath 18s ease-in-out infinite;
        }

        .hvb-orb {
          border-radius: 999px;
          filter: blur(64px);
          transform: translate3d(0, 0, 0);
          mix-blend-mode: screen;
        }

        .hvb-orb-one {
          left: -10%;
          top: 8%;
          width: 48vw;
          height: 48vw;
          background: rgba(147, 51, 234, 0.34);
          animation: hvbDriftOne 16s ease-in-out infinite;
        }

        .hvb-orb-two {
          right: -14%;
          top: 22%;
          width: 50vw;
          height: 50vw;
          background: rgba(212, 175, 55, 0.2);
          animation: hvbDriftTwo 20s ease-in-out infinite;
        }

        .hvb-orb-three {
          left: 25%;
          bottom: -20%;
          width: 58vw;
          height: 58vw;
          background: rgba(88, 28, 135, 0.34);
          animation: hvbPulse 14s ease-in-out infinite;
        }

        .hvb-orb-four {
          right: 18%;
          bottom: 22%;
          width: 18rem;
          height: 18rem;
          background: rgba(216, 180, 254, 0.13);
          filter: blur(48px);
          animation: hvbSoftFloat 18s ease-in-out infinite;
        }

        .hvb-silk {
          height: 18rem;
          width: 142vw;
          border-radius: 999px;
          filter: blur(34px);
          opacity: 0.62;
        }

        .hvb-silk-one {
          left: -22%;
          top: 18%;
          rotate: -9deg;
          background: linear-gradient(90deg, transparent, rgba(188, 84, 255, 0.42), rgba(124, 58, 237, 0.22), transparent);
          animation: hvbSilkOne 13s ease-in-out infinite;
        }

        .hvb-silk-two {
          right: -30%;
          top: 44%;
          rotate: 7deg;
          background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.25), rgba(168, 85, 247, 0.14), transparent);
          animation: hvbSilkTwo 17s ease-in-out infinite;
        }

        .hvb-silk-three {
          left: -28%;
          top: 63%;
          height: 12rem;
          rotate: -4deg;
          opacity: 0.34;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.11), rgba(168, 85, 247, 0.22), transparent);
          animation: hvbSilkThree 20s ease-in-out infinite;
        }

        .hvb-gold-line {
          height: 1.5px;
          width: 125vw;
          background: linear-gradient(90deg, transparent, rgba(253, 224, 71, 0.62), rgba(216, 180, 254, 0.18), transparent);
          filter: blur(0.45px);
          opacity: 0.58;
        }

        .hvb-gold-line-one {
          left: -10%;
          top: 32%;
          rotate: -5deg;
          animation: hvbGoldLine 12s ease-in-out infinite;
        }

        .hvb-gold-line-two {
          right: -18%;
          top: 56%;
          rotate: 6deg;
          animation: hvbGoldLine 16s ease-in-out infinite reverse;
        }

        .hvb-gold-line-three {
          left: -20%;
          top: 73%;
          rotate: -2deg;
          opacity: 0.34;
          animation: hvbGoldLine 21s ease-in-out infinite;
        }

        .hvb-network {
          inset: 0;
          opacity: 0.2;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.09) 1px, transparent 1px),
            radial-gradient(circle at 50% 35%, rgba(253, 224, 71, 0.08), transparent 36%);
          background-size: 76px 76px, 76px 76px, 100% 100%;
          mask-image: radial-gradient(circle at center, black, transparent 76%);
          animation: hvbNetworkShift 24s linear infinite;
        }

        .hvb-signal {
          border: 1px solid rgba(216, 180, 254, 0.26);
          border-radius: 999px;
          opacity: 0.4;
          box-shadow: 0 0 48px rgba(168, 85, 247, 0.08);
        }

        .hvb-signal-one {
          left: 13%;
          top: 22%;
          width: 19rem;
          height: 19rem;
          animation: hvbRing 8s ease-out infinite;
        }

        .hvb-signal-two {
          right: 10%;
          top: 39%;
          width: 15rem;
          height: 15rem;
          animation: hvbRing 10s ease-out infinite 1.4s;
        }

        .hvb-texture {
          inset: 0;
          opacity: 0.105;
          background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.82) 1px, transparent 0);
          background-size: 38px 38px;
          animation: hvbTextureFloat 22s linear infinite;
        }

        .hvb-vignette {
          inset: 0;
          background:
            radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, 0.34) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.5));
        }

        .preset-classic-purple-agency {
          opacity: 0.78;
        }

        .preset-classic-purple-agency .hvb-base {
          background:
            radial-gradient(circle at 50% 8%, rgba(91, 33, 182, 0.32), transparent 50%),
            linear-gradient(180deg, rgba(22, 7, 42, 0.25), rgba(3, 0, 4, 0.7));
        }

        .preset-royal-creator-waves .hvb-silk-one,
        .preset-royal-creator-waves .hvb-silk-two {
          opacity: 0.72;
          filter: blur(28px);
        }

        .preset-golden-network-pulse .hvb-network {
          opacity: 0.3;
          background-size: 62px 62px;
        }

        .preset-golden-network-pulse .hvb-orb-two,
        .preset-golden-network-pulse .hvb-gold-line-one,
        .preset-golden-network-pulse .hvb-gold-line-two {
          opacity: 0.78;
        }

        .preset-galaxy-agency-flow .hvb-texture {
          opacity: 0.16;
          background-size: 32px 32px;
        }

        .preset-galaxy-agency-flow .hvb-orb-one,
        .preset-galaxy-agency-flow .hvb-orb-three {
          filter: blur(82px);
        }

        .preset-live-streaming-signal .hvb-signal-one,
        .preset-live-streaming-signal .hvb-signal-two {
          opacity: 0.58;
          border-color: rgba(253, 224, 71, 0.34);
        }

        .preset-live-streaming-signal .hvb-network {
          opacity: 0.22;
        }

        .preset-premium-glass-orbits .hvb-signal-one,
        .preset-premium-glass-orbits .hvb-signal-two {
          border-color: rgba(255, 255, 255, 0.28);
          box-shadow: inset 0 0 58px rgba(255, 255, 255, 0.04);
        }

        .preset-digital-stage-lights .hvb-gold-line-one,
        .preset-digital-stage-lights .hvb-gold-line-two {
          height: 2px;
          opacity: 0.72;
        }

        .preset-digital-stage-lights .hvb-orb-two {
          background: rgba(250, 204, 21, 0.24);
        }

        @keyframes hvbBaseBreath {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }

        @keyframes hvbDriftOne {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.76; }
          50% { transform: translate3d(8vw, 3vh, 0) scale(1.1); opacity: 1; }
        }

        @keyframes hvbDriftTwo {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.62; }
          50% { transform: translate3d(-7vw, 5vh, 0) scale(1.08); opacity: 0.95; }
        }

        @keyframes hvbPulse {
          0%, 100% { transform: scale(1); opacity: 0.48; }
          50% { transform: scale(1.14); opacity: 0.82; }
        }

        @keyframes hvbSoftFloat {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.34; }
          50% { transform: translate3d(-5vw, -3vh, 0); opacity: 0.68; }
        }

        @keyframes hvbSilkOne {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
          50% { transform: translate3d(5vw, 2vh, 0) rotate(1deg); }
        }

        @keyframes hvbSilkTwo {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(1deg); }
          50% { transform: translate3d(-4vw, -2vh, 0) rotate(-1deg); }
        }

        @keyframes hvbSilkThree {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(4vw, -1vh, 0) rotate(1deg); }
        }

        @keyframes hvbGoldLine {
          0%, 100% { transform: translate3d(0, 0, 0) scaleX(0.92); opacity: 0.42; }
          50% { transform: translate3d(3vw, 1vh, 0) scaleX(1.07); opacity: 0.82; }
        }

        @keyframes hvbNetworkShift {
          0% { background-position: 0 0, 0 0, center; }
          100% { background-position: 76px 76px, 76px 76px, center; }
        }

        @keyframes hvbRing {
          0% { transform: scale(0.72); opacity: 0.5; }
          70% { opacity: 0.18; }
          100% { transform: scale(1.72); opacity: 0; }
        }

        @keyframes hvbTextureFloat {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(38px, 38px, 0); }
        }

        @media (max-width: 768px) {
          .hamza-visual-background-presets {
            opacity: 0.96;
          }

          .hvb-base {
            background:
              radial-gradient(circle at 50% 10%, rgba(181, 90, 255, 0.34), transparent 42%),
              radial-gradient(circle at 18% 34%, rgba(124, 58, 237, 0.22), transparent 34%),
              radial-gradient(circle at 84% 28%, rgba(212, 175, 55, 0.14), transparent 32%),
              linear-gradient(180deg, rgba(25, 3, 52, 0.36), rgba(4, 0, 10, 0.84));
          }

          .hvb-orb {
            filter: blur(52px);
          }

          .hvb-orb-one {
            width: 78vw;
            height: 78vw;
            left: -34%;
            top: 9%;
            background: rgba(147, 51, 234, 0.38);
          }

          .hvb-orb-two {
            width: 76vw;
            height: 76vw;
            right: -38%;
            top: 26%;
            background: rgba(212, 175, 55, 0.18);
          }

          .hvb-orb-three {
            width: 88vw;
            height: 88vw;
            left: 8%;
            bottom: -26%;
          }

          .hvb-orb-four,
          .hvb-silk-three,
          .hvb-signal-two {
            display: none;
          }

          .hvb-network {
            opacity: 0.16;
            background-size: 64px 64px, 64px 64px, 100% 100%;
          }

          .hvb-silk-one {
            top: 20%;
            height: 14rem;
            opacity: 0.56;
            filter: blur(30px);
          }

          .hvb-silk-two {
            display: block;
            top: 50%;
            height: 11rem;
            opacity: 0.34;
            filter: blur(34px);
          }

          .hvb-gold-line {
            opacity: 0.5;
          }

          .hvb-gold-line-two,
          .hvb-gold-line-three {
            display: none;
          }

          .hvb-signal-one {
            left: -8%;
            top: 22%;
            width: 18rem;
            height: 18rem;
            opacity: 0.34;
          }

          .hvb-texture {
            opacity: 0.09;
            background-size: 34px 34px;
          }

          .hamza-visual-background-presets * {
            will-change: auto;
            animation-duration: 32s !important;
          }

          .hamza-visual-background-presets .hvb-signal,
          .hamza-visual-background-presets .hvb-texture {
            animation: none !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hamza-visual-background-presets *,
          .hamza-visual-background-presets {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
