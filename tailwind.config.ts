import type { Config } from "tailwindcss";

const config: Config = {
  // Dark mode via class strategy (user-controlled toggle)
  darkMode: "class",

  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      // ─── HAMZA AGENCY DESIGN TOKENS ───────────────────────────────────────

      colors: {
        // Premium Black palette
        black: {
          DEFAULT: "#0A0A0A",
          pure: "#000000",
          rich: "#0D0D0D",
          deep: "#111111",
          card: "#161616",
          elevated: "#1C1C1C",
          border: "#242424",
          muted: "#2A2A2A",
        },

        // Royal Purple palette
        purple: {
          DEFAULT: "#7B2FBE",
          midnight: "#1A0533",
          deep: "#2D0A5E",
          dark: "#4A1080",
          DEFAULT2: "#6B21A8",
          royal: "#7B2FBE",
          vivid: "#9333EA",
          bright: "#A855F7",
          light: "#C084FC",
          glow: "#D8B4FE",
          haze: "#1E0A3C",
        },

        // Luxury Gold palette
        gold: {
          DEFAULT: "#C9A84C",
          deep: "#8B6914",
          dark: "#A07C20",
          warm: "#B8901E",
          DEFAULT2: "#C9A84C",
          bright: "#D4AF37",
          light: "#E8C86A",
          shine: "#F0D060",
          pale: "#F5E49A",
          cream: "#FDF3D0",
          foil: "#FFD700",
        },

        // White / Off-white tones
        ivory: {
          DEFAULT: "#F5F0E8",
          pure: "#FFFFFF",
          warm: "#FAF7F2",
          soft: "#F5F0E8",
          muted: "#E8E0D0",
        },
      },

      // ─── TYPOGRAPHY ───────────────────────────────────────────────────────

      fontFamily: {
        // Display / Headings — futuristic luxury
        display: ["var(--font-display)", "serif"],
        // Body — clean and modern
        body: ["var(--font-body)", "sans-serif"],
        // Arabic support
        arabic: ["var(--font-arabic)", "serif"],
        // Mono — for code / technical elements
        mono: ["var(--font-mono)", "monospace"],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.625rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.875rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem" }],
        "5xl": ["3rem", { lineHeight: "3.5rem" }],
        "6xl": ["3.75rem", { lineHeight: "4.25rem" }],
        "7xl": ["4.5rem", { lineHeight: "5rem" }],
        "8xl": ["6rem", { lineHeight: "6.5rem" }],
        "9xl": ["8rem", { lineHeight: "8.5rem" }],
      },

      // ─── SPACING ──────────────────────────────────────────────────────────

      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
        "38": "9.5rem",
        "42": "10.5rem",
        "46": "11.5rem",
        "50": "12.5rem",
        "54": "13.5rem",
        "58": "14.5rem",
        "62": "15.5rem",
        "66": "16.5rem",
        "70": "17.5rem",
        "74": "18.5rem",
        "78": "19.5rem",
        "82": "20.5rem",
        "86": "21.5rem",
        "90": "22.5rem",
        "94": "23.5rem",
        "98": "24.5rem",
      },

      // ─── BORDER RADIUS ────────────────────────────────────────────────────

      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
        "6xl": "3rem",
      },

      // ─── SHADOWS ──────────────────────────────────────────────────────────

      boxShadow: {
        // Gold glow effects
        "gold-sm": "0 0 10px rgba(201, 168, 76, 0.2)",
        "gold-md": "0 0 20px rgba(201, 168, 76, 0.3)",
        "gold-lg": "0 0 40px rgba(201, 168, 76, 0.4)",
        "gold-xl": "0 0 60px rgba(201, 168, 76, 0.5)",
        // Purple glow effects
        "purple-sm": "0 0 10px rgba(123, 47, 190, 0.2)",
        "purple-md": "0 0 20px rgba(123, 47, 190, 0.3)",
        "purple-lg": "0 0 40px rgba(123, 47, 190, 0.4)",
        "purple-xl": "0 0 60px rgba(123, 47, 190, 0.5)",
        // Glass effects
        "glass-sm":
          "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-md":
          "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glass-lg":
          "0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
        // Premium elevation
        "premium-sm":
          "0 2px 8px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.8)",
        "premium-md":
          "0 8px 24px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.8)",
        "premium-lg":
          "0 20px 60px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.9)",
      },

      // ─── BACKDROP BLUR ────────────────────────────────────────────────────

      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
        "3xl": "64px",
      },

      // ─── ANIMATIONS ───────────────────────────────────────────────────────

      keyframes: {
        // Splash screen fade
        "splash-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "80%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "0", transform: "scale(1.05)", pointerEvents: "none" },
        },
        // Gold shimmer
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        // Slow pulse glow
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        // Float
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        // Fade in up
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Fade in
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Slide in from left
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // Slide in from right
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // Spin slow (for decorative elements)
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // Marquee scroll
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Scale in
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },

      animation: {
        "splash-out": "splash-out 0.6s ease-in-out forwards",
        shimmer: "shimmer 3s linear infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.7s ease-out forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-in-left": "slide-in-left 0.6s ease-out forwards",
        "slide-in-right": "slide-in-right 0.6s ease-out forwards",
        "spin-slow": "spin-slow 20s linear infinite",
        marquee: "marquee 30s linear infinite",
        "scale-in": "scale-in 0.4s ease-out forwards",
      },

      // ─── BACKGROUND IMAGES ────────────────────────────────────────────────

      backgroundImage: {
        // Gold gradient
        "gold-gradient":
          "linear-gradient(135deg, #8B6914 0%, #C9A84C 40%, #F0D060 60%, #C9A84C 80%, #8B6914 100%)",
        // Gold shimmer (animated)
        "gold-shimmer":
          "linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.4) 50%, transparent 100%)",
        // Purple gradient
        "purple-gradient":
          "linear-gradient(135deg, #1A0533 0%, #4A1080 50%, #9333EA 100%)",
        // Premium dark gradient
        "dark-gradient":
          "linear-gradient(180deg, #0A0A0A 0%, #111111 50%, #0D0D0D 100%)",
        // Glass gradient
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        // Radial glow (gold)
        "gold-radial":
          "radial-gradient(ellipse at center, rgba(201,168,76,0.15) 0%, transparent 70%)",
        // Radial glow (purple)
        "purple-radial":
          "radial-gradient(ellipse at center, rgba(123,47,190,0.2) 0%, transparent 70%)",
        // Hero mesh gradient
        "hero-mesh":
          "radial-gradient(at 20% 50%, rgba(123,47,190,0.3) 0px, transparent 50%), radial-gradient(at 80% 20%, rgba(201,168,76,0.2) 0px, transparent 50%), radial-gradient(at 50% 80%, rgba(74,16,128,0.2) 0px, transparent 50%)",
      },

      // ─── SCREENS ──────────────────────────────────────────────────────────

      screens: {
        xs: "375px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
        "3xl": "1920px",
      },

      // ─── Z-INDEX ──────────────────────────────────────────────────────────

      zIndex: {
        "1": "1",
        "2": "2",
        "3": "3",
        "60": "60",
        "70": "70",
        "80": "80",
        "90": "90",
        "100": "100",
        splash: "9999",
        modal: "9000",
        navbar: "1000",
        dropdown: "500",
        overlay: "400",
        tooltip: "300",
        sticky: "200",
        above: "100",
      },

      // ─── TRANSITIONS ──────────────────────────────────────────────────────

      transitionTimingFunction: {
        luxury: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
        smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
    },
  },

  plugins: [],
};

export default config;
