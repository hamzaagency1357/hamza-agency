"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const logoSrc = "/Logo%20hamza%20agency.jpg";

export default function PublicIntroAndTransitions() {
  const pathname = usePathname();
  const [showIntro, setShowIntro] = useState(false);
  const [isLeavingIntro, setIsLeavingIntro] = useState(false);
  const [playedOnCurrentLoad, setPlayedOnCurrentLoad] = useState(false);

  useEffect(() => {
    if (pathname !== "/" || playedOnCurrentLoad) return;

    setShowIntro(true);
    setIsLeavingIntro(false);
    setPlayedOnCurrentLoad(true);

    const leaveTimer = window.setTimeout(() => setIsLeavingIntro(true), 2600);
    const hideTimer = window.setTimeout(() => setShowIntro(false), 3300);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pathname, playedOnCurrentLoad]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      {showIntro && (
        <div
          className={`fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-[#080012] transition-all duration-700 ${
            isLeavingIntro ? "pointer-events-none opacity-0 scale-[1.04]" : "opacity-100"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.42),transparent_28%),radial-gradient(circle_at_70%_35%,rgba(212,175,55,0.22),transparent_22%),linear-gradient(135deg,#050008,#2f0c56,#080012)]" />
          <div className="absolute h-[520px] w-[520px] animate-[hamzaIntroOrbit_7s_linear_infinite] rounded-full border border-yellow-300/15" />
          <div className="absolute h-[360px] w-[360px] animate-[hamzaIntroOrbitReverse_8s_linear_infinite] rounded-full border border-purple-200/20" />

          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-purple-500/30 blur-3xl" />
              <img
                src={logoSrc}
                alt="HAMZA AGENCY"
                className="relative h-44 w-44 rounded-[2rem] border border-yellow-200/25 object-cover shadow-[0_0_90px_rgba(168,85,247,0.55)] md:h-52 md:w-52"
              />
            </div>

            <div className="mt-8 text-sm font-black uppercase tracking-[0.55em] text-yellow-100 md:text-base">
              HAMZA AGENCY
            </div>
            <div className="mt-3 text-lg font-bold text-white/72 md:text-2xl">
              وكالة حمزة
            </div>
            <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-full animate-[hamzaIntroLoading_2.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-purple-400 via-yellow-200 to-purple-400" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
