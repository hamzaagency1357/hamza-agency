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
      padding-bottom: 8.5rem !important;
    }

    body.public-site-page nav {
      width: 100% !important;
      max-width: 100vw !important;
      gap: 0.6rem !important;
      padding: 0.8rem 0.9rem 0.5rem !important;
      overflow: hidden !important;
    }

    body.public-site-page nav > a:first-child {
      min-width: 0 !important;
      max-width: 78vw !important;
    }

    body.public-site-page nav > a:first-child img {
      height: 38px !important;
      width: 38px !important;
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
      padding-inline: 0.4rem !important;
    }

    body.public-site-page div.overflow-x-auto::-webkit-scrollbar {
      display: none;
    }

    body.public-site-page div.overflow-x-auto a {
      white-space: nowrap !important;
      font-size: 0.76rem !important;
      padding: 0.52rem 0.8rem !important;
      min-width: max-content !important;
    }

    body.public-site-page .hamza-marquee-track {
      font-size: 0.76rem !important;
      line-height: 1.65 !important;
      padding-top: 0.52rem !important;
      padding-bottom: 0.52rem !important;
      max-width: none !important;
    }

    body.public-site-page section:first-of-type {
      padding-top: 0.7rem !important;
      padding-bottom: 5.25rem !important;
    }

    body.public-site-page section:first-of-type img {
      width: min(31vw, 112px) !important;
      height: min(31vw, 112px) !important;
      margin-bottom: 0.85rem !important;
      border-radius: 1.25rem !important;
    }

    body.public-site-page section:first-of-type h1,
    body.public-site-page h1 {
      max-width: 92vw !important;
      font-size: clamp(1.8rem, 7.45vw, 2.65rem) !important;
      line-height: 1.18 !important;
      letter-spacing: -0.02em !important;
      overflow-wrap: break-word !important;
    }

    body.public-site-page section:first-of-type h1 span,
    body.public-site-page h1 span {
      display: block !important;
      max-width: 100% !important;
    }

    body.public-site-page section:first-of-type p {
      max-width: 92vw !important;
      font-size: 0.9rem !important;
      line-height: 1.72 !important;
      margin-top: 0.8rem !important;
    }

    body.public-site-page section:first-of-type .mt-10 {
      margin-top: 1rem !important;
      margin-bottom: 2rem !important;
    }

    body.public-site-page section:first-of-type button,
    body.public-site-page section:first-of-type a[href="/programs"] {
      width: min(100%, 245px) !important;
      padding: 0.76rem 1.2rem !important;
      font-size: 0.92rem !important;
    }

    body.public-site-page a[href*="wa.me"] {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 0.35rem) !important;
      left: 0.55rem !important;
      z-index: 34 !important;
      min-width: 4.25rem !important;
      max-width: 5.9rem !important;
      padding: 0.58rem 0.66rem !important;
      font-size: 0.74rem !important;
      border-radius: 999px !important;
    }

    body.public-site-page div.fixed.bottom-4.right-4 {
      bottom: calc(env(safe-area-inset-bottom, 0px) + 0.35rem) !important;
      right: 0.55rem !important;
      z-index: 35 !important;
      max-width: 7.9rem !important;
    }

    body.public-site-page div.fixed.bottom-4.right-4 > button {
      padding: 0.58rem 0.66rem !important;
      font-size: 0.74rem !important;
      white-space: nowrap !important;
      border-radius: 999px !important;
    }

    body.public-site-page section:nth-of-type(2) {
      padding-bottom: 9rem !important;
    }

    body.public-site-page section:nth-of-type(2) > div {
      padding: 1.15rem !important;
      min-height: 9.4rem !important;
    }

    body.public-site-page section:nth-of-type(2) > div > div:first-child {
      font-size: 2.55rem !important;
    }

    body.public-site-page section:nth-of-type(2) > div > div:last-child {
      font-size: 0.9rem !important;
      line-height: 1.55 !important;
    }
  }

  @media (max-width: 380px) {
    body.public-site-page section:first-of-type h1,
    body.public-site-page h1 {
      font-size: clamp(1.66rem, 7.15vw, 2.35rem) !important;
    }

    body.public-site-page section:first-of-type button,
    body.public-site-page section:first-of-type a[href="/programs"] {
      width: min(100%, 225px) !important;
    }

    body.public-site-page a[href*="wa.me"] {
      max-width: 5.25rem !important;
      font-size: 0.7rem !important;
    }

    body.public-site-page div.fixed.bottom-4.right-4 {
      max-width: 7.1rem !important;
    }

    body.public-site-page div.fixed.bottom-4.right-4 > button {
      font-size: 0.7rem !important;
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
