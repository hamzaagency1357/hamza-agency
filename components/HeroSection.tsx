"use client";

import { openWhatsApp } from "@/config/whatsapp";

/**
 * HeroSection — Full-screen luxury hero
 *
 * Phase 1 placeholder structure.
 * Phase 2 will add:
 *  - Dynamic content from Supabase CMS
 *  - Video background option
 *  - Animated counter stats
 *  - Scroll-triggered reveal animations
 *  - i18n text content
 */

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ paddingTop: "var(--navbar-height)" }}
    >
      {/* ── Background layers ── */}

      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-dark-gradient" />

      {/* Mesh gradient */}
      <div className="absolute inset-0 bg-hero-mesh opacity-60" />

      {/* Animated radial glow — purple */}
      <div
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-20 animate-glow-pulse blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #4A1080 0%, transparent 70%)" }}
      />

      {/* Animated radial glow — gold */}
      <div
        className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-15 animate-glow-pulse blur-3xl pointer-events-none"
        style={{
          background: "radial-gradient(circle, #C9A84C 0%, transparent 70%)",
          animationDelay: "1.2s",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,168,76,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.8) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Decorative top-center line */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 opacity-30"
        style={{
          background: "linear-gradient(to bottom, transparent, #C9A84C)",
        }}
      />

      {/* ── Hero content ── */}
      <div className="relative z-10 section-container text-center py-20">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-DEFAULT/20 bg-gold-DEFAULT/5 mb-8 animate-fade-in"
          style={{ animationDelay: "0.2s", opacity: 0 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold-DEFAULT animate-glow-pulse" />
          <span className="font-body text-xs font-medium tracking-[0.3em] uppercase text-gold-DEFAULT">
            Premium Digital Agency
          </span>
        </div>

        {/* Main headline */}
        <h1
          className="font-display font-light mb-6 animate-fade-in-up"
          style={{
            fontSize: "clamp(2.5rem, 8vw, 7rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            animationDelay: "0.4s",
            opacity: 0,
          }}
        >
          <span className="block text-ivory-warm">We Build</span>
          <span className="block text-gold-shimmer">Luxury Brands</span>
          <span className="block text-ivory-warm/80 italic font-light">
            That Dominate.
          </span>
        </h1>

        {/* Sub-headline */}
        <p
          className="font-body font-light text-text-secondary max-w-2xl mx-auto mb-12 animate-fade-in"
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
            lineHeight: 1.7,
            animationDelay: "0.7s",
            opacity: 0,
          }}
        >
          Hamza Agency delivers premium branding, influencer marketing, and
          performance-driven digital solutions — engineered for businesses that
          refuse to be ordinary.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in"
          style={{ animationDelay: "0.9s", opacity: 0 }}
        >
          <button
            onClick={() => openWhatsApp("services")}
            className="btn-primary text-sm px-8 py-4 min-w-48"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Start a Project
          </button>

          <button
            className="btn-ghost text-sm px-8 py-4 min-w-48"
            onClick={() =>
              document
                .querySelector("#services")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Explore Services
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="transition-transform group-hover:translate-x-1"
            >
              <path
                d="M1 7h12M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Stats row — placeholders (Phase 2 will connect to Supabase) */}
        <div
          className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-in"
          style={{ animationDelay: "1.1s", opacity: 0 }}
        >
          {[
            { value: "200+", label: "Brands Served" },
            { value: "50M+", label: "Reach Generated" },
            { value: "98%", label: "Client Satisfaction" },
            { value: "5+", label: "Years Excellence" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 p-4 rounded-2xl border border-black-border hover:border-gold-DEFAULT/20 transition-all duration-300"
            >
              <span className="font-display text-3xl font-semibold text-gold-gradient">
                {stat.value}
              </span>
              <span className="font-body text-xs text-text-muted tracking-wide">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
        <span className="font-body text-xs tracking-[0.25em] uppercase text-text-muted">
          Scroll
        </span>
        <div className="w-px h-12 overflow-hidden rounded-full bg-black-border">
          <div
            className="w-full h-1/2 rounded-full bg-gold-DEFAULT animate-bounce"
            style={{ animationDuration: "1.5s" }}
          />
        </div>
      </div>

      {/* ── Decorative bottom fade ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--bg-primary))",
        }}
      />
    </section>
  );
}
