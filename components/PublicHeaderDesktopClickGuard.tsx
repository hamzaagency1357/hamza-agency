"use client";

import { useEffect } from "react";

const DESKTOP_NAV_SELECTOR =
  '[data-public-structural-nav="desktop"] button[aria-haspopup="menu"]';

export default function PublicHeaderDesktopClickGuard() {
  useEffect(() => {
    function keepHoveredMenuOpen(event: MouseEvent) {
      if (!window.matchMedia("(min-width: 1101px)").matches) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>(DESKTOP_NAV_SELECTOR);
      if (!button || button.getAttribute("aria-expanded") !== "true") return;

      // React receives the click after hover has already opened the menu. Without
      // this guard, the delegated onClick toggles it closed immediately.
      event.preventDefault();
      event.stopPropagation();
    }

    document.addEventListener("click", keepHoveredMenuOpen, true);
    return () => document.removeEventListener("click", keepHoveredMenuOpen, true);
  }, []);

  return null;
}
