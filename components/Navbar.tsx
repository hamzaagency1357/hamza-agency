"use client";

import { useEffect, useState } from "react";
import { openWhatsApp } from "@/config/whatsapp";

/**
 * Navbar — Floating glass navbar with scroll behavior
 *
 * - Transparent at top, glass-blurred on scroll
 * - Gold logo mark + wordmark
 * - Desktop nav links
 * - Mobile hamburger menu
 * - WhatsApp CTA button
 * - RTL-ready (will be dynamic in Phase 2 with i18n)
 */

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Detect scroll to apply glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    document.body.classList.toggle("no-scroll", menuOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [menuOpen]);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* ── Main Navbar ── */}
      <header
        className={[
          "fixed top-0 left-0 right-0 z-[1000]",
          "transition-all duration-500 ease-luxury",
          // On scroll: glass effect + subtle border
          scrolled
            ? [
                "glass-card",
                "mx-3 mt-3 rounded-2xl",
                "border border-gold-DEFAULT/20",
              ].join(" ")
            : "bg-transparent border-transparent",
        ].join(" ")}
        style={{ height: "var(--navbar-height)" }}
      >
        <nav className="section-container h-full flex items-center justify-between gap-4">
          {/* ── Logo ── */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick("#home");
            }}
            className="flex items-center gap-3 flex-shrink-0 group"
            aria-label="Hamza Agency — Home"
          >
            {/* Logo mark */}
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-gold-DEFAULT/40 group-hover:border-gold-DEFAULT/70 transition-colors duration-300" />
              <div
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)",
                }}
              />
              <span className="relative font-display text-xl font-bold text-gold-shimmer leading-none">
                H
              </span>
            </div>

            {/* Wordmark */}
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-xl font-semibold tracking-widest text-ivory-warm group-hover:text-gold-light transition-colors duration-300">
                HAMZA
              </span>
              <span className="font-body text-[9px] font-medium tracking-[0.35em] uppercase text-gold-DEFAULT/60">
                Agency
              </span>
            </div>
          </a>

          {/* ── Desktop Nav Links ── */}
          <nav
            className="hidden lg:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={[
                  "relative px-4 py-2 rounded-full",
                  "font-body text-sm font-medium",
                  "text-ivory-soft/70 hover:text-ivory-warm",
                  "transition-all duration-300",
                  "group",
                ].join(" ")}
              >
                {link.label}
                {/* Hover underline */}
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-px bg-gold-DEFAULT group-hover:w-4 transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-3">
            {/* Language switcher placeholder (Phase 2) */}
            <button
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black-border hover:border-gold-DEFAULT/30 transition-all duration-300 text-xs font-body font-medium text-text-muted hover:text-ivory-warm"
              aria-label="Change language"
              title="Language switcher — Phase 2"
            >
              <span>EN</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="opacity-50"
              >
                <path
                  d="M2 4l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* WhatsApp CTA */}
            <button
              onClick={() => openWhatsApp("general")}
              className="btn-primary text-xs px-4 py-2"
              aria-label="Contact us on WhatsApp"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-full border border-black-border hover:border-gold-DEFAULT/30 transition-all duration-300"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span
                className={[
                  "w-4 h-px bg-ivory-warm transition-all duration-300",
                  menuOpen ? "rotate-45 translate-y-[5px]" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "w-4 h-px bg-ivory-warm transition-all duration-300",
                  menuOpen ? "opacity-0" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "w-4 h-px bg-ivory-warm transition-all duration-300",
                  menuOpen ? "-rotate-45 -translate-y-[5px]" : "",
                ].join(" ")}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile Menu Overlay ── */}
      <div
        className={[
          "fixed inset-0 z-[999] lg:hidden",
          "transition-all duration-400 ease-luxury",
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black-pure/80 backdrop-blur-xl"
          onClick={() => setMenuOpen(false)}
        />

        {/* Panel */}
        <div
          className={[
            "absolute top-0 right-0 bottom-0 w-72 max-w-full",
            "glass-card border-l border-gold-DEFAULT/15",
            "flex flex-col pt-24 pb-10 px-6",
            "transition-transform duration-400 ease-luxury",
            menuOpen ? "translate-x-0" : "translate-x-full",
          ].join(" ")}
        >
          {/* Nav links */}
          <nav className="flex flex-col gap-1 flex-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-body text-base font-medium text-ivory-soft/80 hover:text-ivory-warm hover:bg-white/5 transition-all duration-200"
                style={{
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <span className="w-1 h-1 rounded-full bg-gold-DEFAULT/50" />
                {link.label}
              </a>
            ))}
          </nav>

          {/* Divider */}
          <div className="divider-gold my-4" />

          {/* Language switcher placeholder */}
          <div className="flex items-center gap-2 mb-4">
            {["EN", "AR", "TR"].map((lang) => (
              <button
                key={lang}
                className={[
                  "flex-1 py-2 rounded-lg text-xs font-body font-medium tracking-wide transition-all duration-200",
                  lang === "EN"
                    ? "bg-gold-DEFAULT/20 text-gold-DEFAULT border border-gold-DEFAULT/30"
                    : "text-text-muted border border-black-border hover:border-gold-DEFAULT/20",
                ].join(" ")}
                title="Language switcher — Phase 2"
              >
                {lang}
              </button>
            ))}
          </div>

          {/* WhatsApp CTA */}
          <button
            onClick={() => {
              setMenuOpen(false);
              openWhatsApp("general");
            }}
            className="btn-primary w-full justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Contact on WhatsApp
          </button>
        </div>
      </div>
    </>
  );
}
