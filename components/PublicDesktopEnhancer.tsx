"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const mobilePublicCss = `
  @media (max-width: 768px) {
    body.public-site-page,
    body.public-site-page main {
      max-width: 100vw !important;
      overflow-x: hidden !important;
    }

    body.public-site-page main {
      padding-bottom: 7rem !important;
    }

    body.public-site-page nav {
      width: 100% !important;
      max-width: 100vw !important;
      gap: 0.75rem !important;
      padding: 1rem 1rem 0.7rem !important;
    }

    body.public-site-page nav > a:first-child {
      min-width: 0 !important;
      max-width: 62vw !important;
    }

    body.public-site-page nav > a:first-child img {
      height: 42px !important;
      width: 42px !important;
      border-radius: 0.9rem !important;
      flex: 0 0 auto !important;
    }

    body.public-site-page nav > a:first-child div {
      min-width: 0 !important;
    }

    body.public-site-page nav > a:first-child div div {
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    body.public-site-page div.overflow-x-auto {
      max-width: 100% !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    body.public-site-page div.overflow-x-auto::-webkit-scrollbar {
      display: none;
    }

    body.public-site-page div.overflow-x-auto a {
      white-space: nowrap !important;
      font-size: 0.8rem !important;
      padding: 0.58rem 0.95rem !important;
    }

    body.public-site-page .hamza-marquee-track {
      max-width: none !important;
      font-size: 0.8rem !important;
      padding-top: 0.55rem !important;
      padding-bottom: 0.55rem !important;
    }

    body.public-site-page section:first-of-type {
      padding-top: 0.8rem !important;
      padding-bottom: 6.25rem !important;
    }

    body.public-site-page section:first-of-type img {
      width: min(34vw, 126px) !important;
      height: min(34vw, 126px) !important;
      margin-bottom: 1rem !important;
      border-radius: 1.35rem !important;
    }

    body.public-site-page section:first-of-type h1,
    body.public-site-page h1 {
      max-width: min(92vw, 680px) !important;
      font-size: clamp(2.15rem, 8.9vw, 3.15rem) !important;
      line-height: 1.16 !important;
      letter-spacing: -0.035em !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
    }

    body.public-site-page section:first-of-type h1 span,
    body.public-site-page h1 span {
      display: block !important;
      max-width: 100% !important;
    }

    body.public-site-page section:first-of-type p {
      max-width: 92vw !important;
      font-size: 0.95rem !important;
      line-height: 1.75 !important;
      margin-top: 0.85rem !important;
    }

    body.public-site-page section:first-of-type .mt-10 {
      margin-top: 1.05rem !important;
      margin-bottom: 2.5rem !important;
    }

    body.public-site-page section:first-of-type button,
    body.public-site-page section:first-of-type a[href="/programs"] {
      width: min(100%, 260px) !important;
      padding: 0.82rem 1.35rem !important;
      font-size: 0.96rem !important;
    }

    body.public-site-page a[href^="https://wa.me"] {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 0.65rem) !important;
      left: 0.65rem !important;
      z-index: 34 !important;
      padding: 0.72rem 0.85rem !important;
      font-size: 0.82rem !important;
    }

    body.public-site-page div.fixed.bottom-4.right-4 {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 0.65rem) !important;
      right: 0.65rem !important;
      z-index: 35 !important;
    }

    body.public-site-page div.fixed.bottom-4.right-4 > button {
      padding: 0.72rem 0.85rem !important;
      font-size: 0.82rem !important;
    }
  }

  @media (max-width: 380px) {
    body.public-site-page section:first-of-type h1,
    body.public-site-page h1 {
      font-size: clamp(2rem, 8.7vw, 2.85rem) !important;
      line-height: 1.15 !important;
    }

    body.public-site-page section:first-of-type button,
    body.public-site-page section:first-of-type a[href="/programs"] {
      width: min(100%, 240px) !important;
    }
  }
`;

export default function PublicDesktopEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    let style = document.getElementById("hamza-public-mobile-responsive-fix");

    if (!style) {
      style = document.createElement("style");
      style.id = "hamza-public-mobile-responsive-fix";
      style.textContent = mobilePublicCss;
      document.head.appendChild(style);
    } else {
      style.textContent = mobilePublicCss;
    }
  }, []);

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    document.body.classList.toggle("public-site-page", !isAdmin);
    document.body.classList.toggle("admin-site-page", isAdmin);

    return () => {
      document.body.classList.remove("public-site-page");
      document.body.classList.remove("admin-site-page");
    };
  }, [pathname]);

  return null;
}
