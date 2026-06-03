"use client";

import { useEffect, useState } from "react";

/**
 * SplashScreen — Luxury animated intro screen
 *
 * Shows for ~2.2s, then fades out with a scale + opacity transition.
 * After the animation, the component unmounts entirely for performance.
 */

interface SplashScreenProps {
  /** Duration in ms before the splash begins fading. Default: 2200 */
  duration?: number;
}

export default function SplashScreen({ duration = 2200 }: SplashScreenProps) {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">(
    "visible"
  );

  useEffect(() => {
    // Lock body scroll while splash is showing
    document.body.classList.add("no-scroll");

    // Start fade-out after duration
    const fadeTimer = setTimeout(() => {
      setPhase("fading");
    }, duration);

    // Remove from DOM after animation completes (600ms fade)
    const unmountTimer = setTimeout(() => {
      setPhase("hidden");
      document.body.classList.remove("no-scroll");
    }, duration + 700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
      document.body.classList.remove("no-scroll");
    };
  }, [duration]);

  // Unmounted — return nothing
  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={[
        // Layout
        "fixed inset-0 flex items-center justify-center",
        // Stacking
        "z-[9999]",
        // Background
        "bg-black-pure",
        // Transition
        "transition-all duration-700 ease-in-out",
        phase === "fading"
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100",
      ].join(" ")}
    >
      {/* Background mesh */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(74,16,128,0.5) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(201,168,76,0.2) 0%, transparent 60%)",
        }}
      />

      {/* Animated grid lines */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main logo mark */}
      <div className="relative flex flex-col items-center gap-6 z-10">
        {/* Logo ring + H mark */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Outer rotating ring */}
          <div
            className="absolute inset-0 rounded-full border border-gold-DEFAULT/30 animate-spin-slow"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, rgba(201,168,76,0.15) 25%, rgba(201,168,76,0.4) 50%, rgba(201,168,76,0.15) 75%, transparent 100%)",
            }}
          />

          {/* Middle ring */}
          <div className="absolute inset-3 rounded-full border border-purple-royal/40" />

          {/* Inner glow */}
          <div
            className="absolute inset-6 rounded-full animate-glow-pulse"
            style={{
              background:
                "radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)",
            }}
          />

          {/* H lettermark */}
          <span
            className="relative z-10 font-display text-6xl font-bold leading-none text-gold-shimmer"
            style={{ lineHeight: 1 }}
          >
            H
          </span>
        </div>

        {/* Agency name */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-px bg-gold-DEFAULT/50" />
            <span className="font-body text-xs font-medium tracking-[0.4em] uppercase text-gold-DEFAULT/70">
              Agency
            </span>
            <div className="w-6 h-px bg-gold-DEFAULT/50" />
          </div>
          <h1
            className="font-display text-3xl font-light tracking-widest text-ivory-warm"
            style={{ letterSpacing: "0.2em" }}
          >
            HAMZA
          </h1>
        </div>

        {/* Loading bar */}
        <div className="w-40 h-px bg-black-border overflow-hidden rounded-full mt-4">
          <div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #8B6914, #C9A84C, #F0D060, #C9A84C)",
              animation: `loadBar ${duration}ms ease-in-out forwards`,
            }}
          />
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="absolute bottom-10 left-0 right-0 text-center">
        <p className="font-body text-xs tracking-[0.3em] uppercase text-text-muted">
          Luxury · Futuristic · Premium
        </p>
      </div>

      {/* CSS for loading bar animation */}
      <style jsx>{`
        @keyframes loadBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
