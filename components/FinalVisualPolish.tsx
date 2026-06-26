"use client";

import { usePathname } from "next/navigation";

const polishCards = [
  { label: "Creators", value: "إدارة صناع المحتوى" },
  { label: "Live", value: "برامج البث المباشر" },
  { label: "AI", value: "دعم ذكي" },
  { label: "Growth", value: "نمو واحتراف" },
];

export default function FinalVisualPolish() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || pathname === "/maintenance") return null;

  return (
    <>
      <div aria-hidden="true" className="hamza-final-polish">
        <div className="hfp-glow hfp-glow-one" />
        <div className="hfp-glow hfp-glow-two" />
        <div className="hfp-orbit hfp-orbit-one" />
        <div className="hfp-orbit hfp-orbit-two" />
        <div className="hfp-shine hfp-shine-one" />
        <div className="hfp-shine hfp-shine-two" />
        <div className="hfp-card-stack">
          {polishCards.map((card, index) => (
            <div key={card.label} className={`hfp-mini-card hfp-mini-card-${index + 1}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hamza-final-polish {
          position: fixed;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          overflow: hidden;
          isolation: isolate;
        }

        .hamza-final-polish * {
          position: absolute;
          pointer-events: none;
        }

        .hfp-glow {
          border-radius: 999px;
          filter: blur(54px);
          mix-blend-mode: screen;
          opacity: 0.58;
        }

        .hfp-glow-one {
          width: 18rem;
          height: 18rem;
          left: -5rem;
          top: 18%;
          background: rgba(168, 85, 247, 0.22);
          animation: hfpFloatOne 16s ease-in-out infinite;
        }

        .hfp-glow-two {
          width: 16rem;
          height: 16rem;
          right: -6rem;
          bottom: 14%;
          background: rgba(250, 204, 21, 0.14);
          animation: hfpFloatTwo 19s ease-in-out infinite;
        }

        .hfp-orbit {
          border-radius: 999px;
          border: 1px solid rgba(216, 180, 254, 0.13);
          box-shadow: 0 0 40px rgba(168, 85, 247, 0.08);
          opacity: 0.42;
        }

        .hfp-orbit-one {
          width: 22rem;
          height: 22rem;
          left: 6%;
          bottom: 12%;
          animation: hfpOrbitPulse 10s ease-in-out infinite;
        }

        .hfp-orbit-two {
          width: 15rem;
          height: 15rem;
          right: 9%;
          top: 16%;
          animation: hfpOrbitPulse 13s ease-in-out infinite reverse;
        }

        .hfp-shine {
          height: 1px;
          width: 42vw;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.46), rgba(216, 180, 254, 0.22), transparent);
          opacity: 0.46;
          filter: blur(0.25px);
        }

        .hfp-shine-one {
          left: 4%;
          top: 30%;
          rotate: -8deg;
          animation: hfpShine 11s ease-in-out infinite;
        }

        .hfp-shine-two {
          right: 0;
          bottom: 28%;
          rotate: 7deg;
          animation: hfpShine 14s ease-in-out infinite reverse;
        }

        .hfp-card-stack {
          right: 1.2rem;
          top: 22%;
          width: 190px;
          height: 360px;
          opacity: 0.78;
        }

        .hfp-mini-card {
          right: 0;
          width: 168px;
          min-height: 74px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(124,58,237,0.08));
          box-shadow: 0 22px 70px rgba(9, 0, 15, 0.32), inset 0 1px 0 rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
          padding: 14px;
          transform: translate3d(0, 0, 0) rotate(var(--rotate, 0deg));
          animation: hfpCardFloat 8s ease-in-out infinite;
        }

        .hfp-mini-card span,
        .hfp-mini-card strong {
          position: static;
          display: block;
        }

        .hfp-mini-card span {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(250, 204, 21, 0.72);
        }

        .hfp-mini-card strong {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.84);
        }

        .hfp-mini-card-1 { top: 0; --rotate: 4deg; animation-delay: 0s; }
        .hfp-mini-card-2 { top: 82px; right: 22px; --rotate: -5deg; animation-delay: -1.5s; }
        .hfp-mini-card-3 { top: 164px; --rotate: 5deg; animation-delay: -3s; }
        .hfp-mini-card-4 { top: 246px; right: 18px; --rotate: -4deg; animation-delay: -4.5s; }

        ${pathname === "/" ? `
          main[dir="rtl"] section.grid.max-w-6xl > div > div.text-4xl.font-black {
            direction: ltr;
            unicode-bidi: isolate;
          }
        ` : ""}

        @keyframes hfpFloatOne {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.42; }
          50% { transform: translate3d(2.5rem, -1.4rem, 0) scale(1.08); opacity: 0.68; }
        }

        @keyframes hfpFloatTwo {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.34; }
          50% { transform: translate3d(-2rem, 1.6rem, 0) scale(1.08); opacity: 0.56; }
        }

        @keyframes hfpOrbitPulse {
          0%, 100% { transform: scale(0.96); opacity: 0.2; }
          50% { transform: scale(1.08); opacity: 0.48; }
        }

        @keyframes hfpShine {
          0%, 100% { transform: translateX(-8%); opacity: 0.22; }
          50% { transform: translateX(8%); opacity: 0.56; }
        }

        @keyframes hfpCardFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--rotate, 0deg)); }
          50% { transform: translate3d(-8px, -10px, 0) rotate(calc(var(--rotate, 0deg) * -1)); }
        }

        @media (max-width: 1024px) {
          .hfp-card-stack {
            display: none;
          }

          .hfp-orbit-one,
          .hfp-orbit-two {
            opacity: 0.2;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hamza-final-polish * {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
