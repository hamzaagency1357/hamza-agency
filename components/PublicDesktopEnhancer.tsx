"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const publicMobileCss = `
  @media (max-width: 768px) {
    html,
    body,
    body.public-site-page,
    body.public-site-page main {
      max-width: 100vw !important;
      overflow-x: hidden !important;
    }

    body.public-site-page main {
      padding-bottom: 7.5rem !important;
    }

    body.public-site-page nav {
      width: 100% !important;
      max-width: 100vw !important;
      gap: 0.65rem !important;
      padding: 0.85rem 1rem 0.55rem !important;
      overflow: hidden !important;
    }

    body.public-site-page nav > a:first-child {
      min-width: 0 !important;
      max-width: 76vw !important;
    }

    body.public-site-page nav > a:first-child img {
      height: 40px !important;
      width: 40px !important;
      flex: 0 0 auto !important;
    }

    body.public-site-page nav > a:first-child div,
    body.public-site-page nav > a:first-child div div {
      min-width: 0 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    body.public-site-page div.overflow-x-auto {
      max-width: 100% !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-inline: 0.15rem !important;
    }

    body.public-site-page div.overflow-x-auto::-webkit-scrollbar {
      display: none;
    }

    body.public-site-page div.overflow-x-auto a {
      white-space: nowrap !important;
      font-size: 0.78rem !important;
      padding: 0.55rem 0.85rem !important;
      min-width: max-content !important;
    }

    body.public-site-page .hamza-marquee-track {
      font-size: 0.78rem !important;
      line-height: 1.65 !important;
      padding-top: 0.55rem !important;
      padding-bottom: 0.55rem !important;
      max-width: none !important;
    }

    body.public-site-page section:first-of-type {
      padding-top: 0.75rem !important;
      padding-bottom: 5rem !important;
    }

    body.public-site-page section:first-of-type img {
      width: min(32vw, 118px) !important;
      height: min(32vw, 118px) !important;
      margin-bottom: 0.9rem !important;
      border-radius: 1.3rem !important;
    }

    body.public-site-page section:first-of-type h1,
    body.public-site-page h1 {
      max-width: 92vw !important;
      font-size: clamp(1.85rem, 7.65vw, 2.75rem) !important;
      line-height: 1.18 !important;
      letter-spacing: -0.025em !important;
      overflow-wrap: break-word !important;
    }

    body.public-site-page section:first-of-type h1 span,
    body.public-site-page h1 span {
      display: block !important;
      max-width: 100% !important;
    }

    body.public-site-page section:first-of-type p {
      max-width: 92vw !important;
      font-size: 0.92rem !important;
      line-height: 1.75 !important;
      margin-top: 0.85rem !important;
    }

    body.public-site-page section:first-of-type .mt-10 {
      margin-top: 1rem !important;
      margin-bottom: 2.1rem !important;
    }

    body.public-site-page section:first-of-type button,
    body.public-site-page section:first-of-type a[href="/programs"] {
      width: min(100%, 250px) !important;
      padding: 0.78rem 1.25rem !important;
      font-size: 0.94rem !important;
    }

    body.public-site-page a[href*="wa.me"] {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 0.7rem) !important;
      left: 0.65rem !important;
      z-index: 34 !important;
      padding: 0.68rem 0.78rem !important;
      font-size: 0.78rem !important;
      max-width: 7rem !important;
    }

    body.public-site-page div.fixed.bottom-4.right-4 {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 0.7rem) !important;
      right: 0.65rem !important;
      z-index: 35 !important;
      max-width: 9.5rem !important;
    }

    body.public-site-page div.fixed.bottom-4.right-4 > button {
      padding: 0.68rem 0.78rem !important;
      font-size: 0.78rem !important;
      white-space: nowrap !important;
    }

    body.public-site-page section:nth-of-type(2) {
      padding-bottom: 6rem !important;
    }
  }

  @media (max-width: 380px) {
    body.public-site-page section:first-of-type h1,
    body.public-site-page h1 {
      font-size: clamp(1.72rem, 7.35vw, 2.45rem) !important;
    }

    body.public-site-page section:first-of-type button,
    body.public-site-page section:first-of-type a[href="/programs"] {
      width: min(100%, 235px) !important;
    }
  }
`;

export default function PublicDesktopEnhancer() {
  const pathname = usePathname();

  useEffect(() => {
    let style = document.getElementById("hamza-public-mobile-safe-css");

    if (!style) {
      style = document.createElement("style");
      style.id = "hamza-public-mobile-safe-css";
      document.head.appendChild(style);
    }

    style.textContent = publicMobileCss;
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
