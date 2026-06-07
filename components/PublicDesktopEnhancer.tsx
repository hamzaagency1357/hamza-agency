"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PublicDesktopEnhancer() {
  const pathname = usePathname();

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
