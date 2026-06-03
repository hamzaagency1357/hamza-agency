"use client";

import { openWhatsApp } from "@/config/whatsapp";

/**
 * Footer — Premium gold-accented footer
 *
 * Phase 1 placeholder structure.
 * Phase 2 will add:
 *  - Dynamic links from Supabase CMS
 *  - Newsletter subscription
 *  - i18n support
 */

const FOOTER_LINKS = {
  Services: [
    { label: "Branding", href: "#" },
    { label: "Social Media", href: "#" },
    { label: "Influencer Marketing", href: "#" },
    { label: "Content Creation", href: "#" },
    { label: "Performance Ads", href: "#" },
  ],
  Company: [
    { label: "About Us", href: "#" },
    { label: "Our Work", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Press", href: "#" },
  ],
  Connect: [
    { label: "WhatsApp", href: "#", onClick: () => openWhatsApp() },
    { label: "Instagram", href: "#" },
    { label: "LinkedIn", href: "#" },
    { label: "TikTok", href: "#" },
    { label: "YouTube", href: "#" },
  ],
} as const;

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="relative bg-black-pure overflow-hidden">
      {/* Top divider with gold glow */}
      <div className="divider-gold" />

      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-10 pointer-events-none blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #C9A84C 0%, transparent 70%)",
        }}
      />

      {/* Main footer content */}
      <div className="section-container relative z-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

          {/* ── Brand column ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Logo */}
            <a
              href="#home"
              className="flex items-center gap-3 group w-fit"
              aria-label="Hamza Agency"
            >
              <div className="relative w-10 h-10 flex items-center justify-center rounded-full border border-gold-DEFAULT/40 group-hover:border-gold-DEFAULT/70 transition-colors duration-300">
                <span className="font-display text-2xl font-bold text-gold-shimmer leading-none">
                  H
                </span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-2xl font-semibold tracking-widest text-ivory-warm">
                  HAMZA
                </span>
                <span className="font-body text-[9px] font-medium tracking-[0.35em] uppercase text-gold-DEFAULT/60">
                  Agency
                </span>
              </div>
            </a>

            {/* Description */}
            <p className="font-body text-sm text-text-muted leading-relaxed max-w-sm">
              A luxury, futuristic digital agency delivering premium branding,
              influencer marketing, and performance-driven solutions.
            </p>

            {/* WhatsApp CTA */}
            <button
              onClick={() => openWhatsApp()}
              className="btn-primary w-fit text-sm px-6 py-3"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Get in Touch
            </button>
          </div>

          {/* ── Link columns ── */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title} className="flex flex-col gap-4">
              <h4 className="font-body text-xs font-semibold tracking-[0.3em] uppercase text-gold-DEFAULT">
                {title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={
                        "onClick" in link
                          ? (e) => {
                              e.preventDefault();
                              link.onClick?.();
                            }
                          : undefined
                      }
                      className="font-body text-sm text-text-muted hover:text-ivory-warm hover:translate-x-1 transition-all duration-200 inline-flex items-center gap-1.5 group"
                    >
                      <span className="w-0 h-px bg-gold-DEFAULT/50 group-hover:w-2 transition-all duration-200" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="divider-gold mt-12 mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-text-muted">
            © {CURRENT_YEAR} Hamza Agency. All rights reserved.
          </p>

          {/* Language indicator */}
          <div className="flex items-center gap-3">
            {["EN", "AR", "TR"].map((lang, i) => (
              <span
                key={lang}
                className={[
                  "font-body text-xs cursor-pointer transition-colors duration-200",
                  i === 0
                    ? "text-gold-DEFAULT"
                    : "text-text-muted hover:text-text-secondary",
                ].join(" ")}
                title="Language switcher — Phase 2"
              >
                {lang}
              </span>
            ))}
          </div>

          {/* Legal links */}
          <div className="flex items-center gap-4">
            {["Privacy Policy", "Terms of Service"].map((item) => (
              <a
                key={item}
                href="#"
                className="font-body text-xs text-text-muted hover:text-text-secondary transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
