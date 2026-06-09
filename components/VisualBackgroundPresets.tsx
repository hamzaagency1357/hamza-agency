"use client";

import { usePathname } from "next/navigation";

type PresetId =
  | "global-luxury-aurora"
  | "classic-purple-agency"
  | "royal-creator-waves"
  | "golden-network-pulse"
  | "galaxy-agency-flow"
  | "live-streaming-signal"
  | "premium-glass-orbits"
  | "digital-stage-lights";

const defaultPreset: PresetId = "global-luxury-aurora";

const visualBackgroundPresets: Record<PresetId, string> = {
  "global-luxury-aurora": "preset-global-luxury-aurora",
  "classic-purple-agency": "preset-classic-purple-agency",
  "royal-creator-waves": "preset-royal-creator-waves",
  "golden-network-pulse": "preset-golden-network-pulse",
  "galaxy-agency-flow": "preset-galaxy-agency-flow",
  "live-streaming-signal": "preset-live-streaming-signal",
  "premium-glass-orbits": "preset-premium-glass-orbits",
  "digital-stage-lights": "preset-digital-stage-lights",
};

function getActivePreset(): PresetId {
  if (typeof window === "undefined") return defaultPreset;

  const saved = window.localStorage.getItem("hamza_visual_background_preset");

  if (saved && saved in visualBackgroundPresets) {
    return saved as PresetId;
  }

  return defaultPreset;
}

export default function VisualBackgroundPresets() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  const activePreset = getActivePreset();
  const presetClassName = visualBackgroundPresets[activePreset];

  return (
    <>
      <div
        aria-hidden="true"
        className={`hamza-visual-background-presets ${presetClassName}`}
      >
        <div className="hvb-base" />
        <div className="hvb-orb hvb-orb-one" />
        <div className="hvb-orb hvb-orb-two" />
        <div className="hvb-orb hvb-orb-three" />
        <div className="hvb-silk hvb-silk-one" />
        <div className="hvb-silk hvb-silk-two" />
        <div className="hvb-gold-line hvb-gold-line-one" />
        <div className="hvb-gold-line hvb-gold-line-two" />
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
          opacity: 0.94;
        }

        .hamza-visual-background-presets * {
          position: absolute;
          will-change: transform, opacity;
        }

        .hvb-base {
          inset: 0;
          background:
            radial-gradient(circle at 50% 18%, rgba(168, 85, 247, 0.18), transparent 42%),
            linear-gradient(180deg, rgba(10, 0, 18, 0.12), rgba(2, 0, 6, 0.66));
        }

        .hvb-orb {
          border-radius: 999px;
          filter: blur(70px);
          transform: translate3d(0, 0, 0);
          mix-blend-mode: screen;
        }

        .hvb-orb-one {
          left: -12%;
          top: 10%;
          width: 42vw;
          height: 42vw;
          background: rgba(124, 58, 237, 0.24);
          animation: hvbDriftOne 18s ease-in-out infinite;
        }

        .hvb-orb-two {
          right: -16%;
          top: 28%;
          width: 48vw;
          height: 48vw;
          background: rgba(212, 175, 55, 0.13);
          animation: hvbDriftTwo 22s ease-in-out infinite;
        }

        .hvb-orb-three {
          left: 28%;
          bottom: -22%;
          width: 52vw;
          height: 52vw;
          background: rgba(88, 28, 135, 0.24);
          animation: hvbPulse 16s ease-in-out infinite;
        }

        .hvb-silk {
          height: 18rem;
          width: 140vw;
          border-radius: 999px;
          filter: blur(42px);
          opacity: 0.48;
        }

        .hvb-silk-one {
          left: -22%;
          top: 20%;
          rotate: -9deg;
          background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.28), transparent);
          animation: hvbSilkOne 15s ease-in-out infinite;
        }

        .hvb-silk-two {
          right: -30%;
          top: 46%;
          rotate: 7deg;
          background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.16), transparent);
          animation: hvbSilkTwo 19s ease-in-out infinite;
        }

        .hvb-gold-line {
          height: 1px;
          width: 120vw;
          background: linear-gradient(90deg, transparent, rgba(253, 224, 71, 0.42), transparent);
          filter: blur(0.5px);
          opacity: 0.44;
        }

        .hvb-gold-line-one {
          left: -10%;
          top: 34%;
          rotate: -5deg;
          animation: hvbGoldLine 13s ease-in-out infinite;
        }

        .hvb-gold-line-two {
          right: -18%;
          top: 58%;
          rotate: 6deg;
          animation: hvbGoldLine 17s ease-in-out infinite reverse;
        }

        .hvb-network {
          inset: 0;
          opacity: 0.15;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
          background-size: 86px 86px;
          mask-image: radial-gradient(circle at center, black, transparent 72%);
          animation: hvbNetworkShift 28s linear infinite;
        }

        .hvb-signal {
          border: 1px solid rgba(216, 180, 254, 0.18);
          border-radius: 999px;
          opacity: 0.3;
        }

        .hvb-signal-one {
          left: 16%;
          top: 24%;
          width: 18rem;
          height: 18rem;
          animation: hvbRing 9s ease-out infinite;
        }

        .hvb-signal-two {
          right: 12%;
          top: 42%;
          width: 14rem;
          height: 14rem;
          animation: hvbRing 11s ease-out infinite 1.5s;
        }

        .hvb-texture {
          inset: 0;
          opacity: 0.07;
          background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.72) 1px, transparent 0);
          background-size: 42px 42px;
          animation: hvbTextureFloat 24s linear infinite;
        }

        .hvb-vignette {
          inset: 0;
          background:
            radial-gradient(circle at center, transparent 24%, rgba(0, 0, 0, 0.36) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.58));
        }

        .preset-classic-purple-agency {
          opacity: 0.72;
        }

        .preset-classic-purple-agency .hvb-base {
          background:
            radial-gradient(circle at 50% 8%, rgba(91, 33, 182, 0.26), transparent 50%),
            linear-gradient(180deg, rgba(22, 7, 42, 0.22), rgba(3, 0, 4, 0.72));
        }

        .preset-royal-creator-waves .hvb-silk-one,
        .preset-royal-creator-waves .hvb-silk-two {
          opacity: 0.62;
          filter: blur(34px);
        }

        .preset-golden-network-pulse .hvb-network {
          opacity: 0.26;
          background-size: 64px 64px;
        }

        .preset-golden-network-pulse .hvb-orb-two,
        .preset-golden-network-pulse .hvb-gold-line-one,
        .preset-golden-network-pulse .hvb-gold-line-two {
          opacity: 0.72;
        }

        .preset-galaxy-agency-flow .hvb-texture {
          opacity: 0.14;
          background-size: 34px 34px;
        }

        .preset-galaxy-agency-flow .hvb-orb-one,
        .preset-galaxy-agency-flow .hvb-orb-three {
          filter: blur(90px);
        }

        .preset-live-streaming-signal .hvb-signal-one,
        .preset-live-streaming-signal .hvb-signal-two {
          opacity: 0.48;
          border-color: rgba(253, 224, 71, 0.26);
        }

        .preset-live-streaming-signal .hvb-network {
          opacity: 0.18;
        }

        .preset-premium-glass-orbits .hvb-signal-one,
        .preset-premium-glass-orbits .hvb-signal-two {
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: inset 0 0 48px rgba(255, 255, 255, 0.03);
        }

        .preset-digital-stage-lights .hvb-gold-line-one,
        .preset-digital-stage-lights .hvb-gold-line-two {
          height: 2px;
          opacity: 0.62;
        }

        .preset-digital-stage-lights .hvb-orb-two {
          background: rgba(250, 204, 21, 0.18);
        }

        @keyframes hvbDriftOne {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.72; }
          50% { transform: translate3d(8vw, 3vh, 0) scale(1.08); opacity: 0.95; }
        }

        @keyframes hvbDriftTwo {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.58; }
          50% { transform: translate3d(-7vw, 5vh, 0) scale(1.06); opacity: 0.86; }
        }

        @keyframes hvbPulse {
          0%, 100% { transform: scale(1); opacity: 0.42; }
          50% { transform: scale(1.12); opacity: 0.74; }
        }

        @keyframes hvbSilkOne {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
          50% { transform: translate3d(5vw, 2vh, 0) rotate(1deg); }
        }

        @keyframes hvbSilkTwo {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(1deg); }
          50% { transform: translate3d(-4vw, -2vh, 0) rotate(-1deg); }
        }

        @keyframes hvbGoldLine {
          0%, 100% { transform: translate3d(0, 0, 0) scaleX(0.92); opacity: 0.34; }
          50% { transform: translate3d(3vw, 1vh, 0) scaleX(1.05); opacity: 0.72; }
        }

        @keyframes hvbNetworkShift {
          0% { background-position: 0 0; }
          100% { background-position: 86px 86px; }
        }

        @keyframes hvbRing {
          0% { transform: scale(0.72); opacity: 0.38; }
          70% { opacity: 0.13; }
          100% { transform: scale(1.7); opacity: 0; }
        }

        @keyframes hvbTextureFloat {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(42px, 42px, 0); }
        }

        @media (max-width: 768px) {
          .hamza-visual-background-presets {
            opacity: 0.76;
          }

          .hvb-orb {
            filter: blur(58px);
          }

          .hvb-silk-two,
          .hvb-signal-two,
          .hvb-network {
            display: none;
          }

          .hvb-silk-one {
            height: 14rem;
            opacity: 0.42;
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
