"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AuthRecoveryRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash || pathname === "/admin/reset-password") return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const hasRecoveryToken =
      params.has("access_token") &&
      (params.get("type") === "recovery" || params.has("refresh_token"));

    if (!hasRecoveryToken) return;

    window.location.replace(`/admin/reset-password${window.location.search}${hash}`);
  }, [pathname]);

  return null;
}
