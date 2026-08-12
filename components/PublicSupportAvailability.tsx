"use client";

import { usePathname } from "next/navigation";
import { getApprovedSupportCopy } from "@/lib/i18n/supportCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

function shouldHideSupportAvailability(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/portal") || pathname === "/maintenance" || pathname === "/pr99-e2e";
}

export default function PublicSupportAvailability() {
  const pathname = usePathname() || "/";
  const language = useSiteLanguage();

  if (shouldHideSupportAvailability(pathname)) return null;

  return (
    <aside
      className="hamza-approved-support-copy relative z-20 border-t border-white/10 bg-[#070009]/92 px-5 py-4 text-center text-sm leading-7 text-white/65"
      data-support-availability="approved"
    >
      {getApprovedSupportCopy(language)}
    </aside>
  );
}
