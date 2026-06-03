/**
 * ─────────────────────────────────────────────────────────────
 * HAMZA AGENCY — Homepage (Phase 1 Foundation)
 * ─────────────────────────────────────────────────────────────
 *
 * Current Phase 1 sections:
 *  ✅ SplashScreen
 *  ✅ Floating Glass Navbar
 *  ✅ Hero Section
 *  ✅ Footer
 *
 * Phase 2+ sections to add here:
 *  🔲 Services Section
 *  🔲 Portfolio / Work Section
 *  🔲 About Section
 *  🔲 Testimonials Section
 *  🔲 Pricing Section
 *  🔲 FAQ Section
 *  🔲 Contact / CTA Section
 *  🔲 WhatsApp floating button
 * ─────────────────────────────────────────────────────────────
 */

import SplashScreen from "@/components/SplashScreen";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      {/* ── Splash screen (shows on first load) ── */}
      <SplashScreen duration={2200} />

      {/* ── Global floating navbar ── */}
      <Navbar />

      {/* ── Page content ── */}
      <main>
        {/* Hero */}
        <HeroSection />

        {/* ───────────────────────────────────────
            PHASE 2+ SECTIONS WILL GO HERE
            Example structure:

            <ServicesSection />
            <WorkSection />
            <AboutSection />
            <TestimonialsSection />
            <PricingSection />
            <FaqSection />
            <ContactSection />
        ─────────────────────────────────────── */}

        {/* Phase 1 coming-soon placeholder for sections below hero */}
        <section
          id="services"
          className="min-h-screen flex items-center justify-center bg-black-deep"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black-border">
              <span className="w-2 h-2 rounded-full bg-gold-DEFAULT/50 animate-glow-pulse" />
              <span className="font-body text-xs tracking-[0.3em] uppercase text-text-muted">
                Phase 2
              </span>
            </div>
            <h2 className="font-display text-4xl font-light text-ivory-warm/40">
              Services Section
            </h2>
            <p className="font-body text-sm text-text-muted">
              Coming in Phase 2
            </p>
          </div>
        </section>
      </main>

      {/* ── Global footer ── */}
      <Footer />
    </>
  );
}
