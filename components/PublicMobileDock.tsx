"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PublicAiSupport from "@/components/PublicAiSupport";
import PublicQuickNav from "@/components/PublicQuickNav";
import { getAiSupportCopy } from "@/lib/i18n/aiSupport";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getCookieConsentCopy } from "@/lib/i18n/privacyAndPwaCopy";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type OpenPanel = "ai" | "quick-nav" | null;
type PublicSettingRow = { setting_key: string | null; setting_value: string | null };

const fallbackWhatsappNumber = "905011730377";
const whatsappSettingKeys = ["primary_whatsapp", "whatsapp", "support_whatsapp"];

function cleanWhatsappNumber(value: string | null | undefined) {
  const cleaned = (value || "").replace(/[^\d]/g, "");
  return cleaned || fallbackWhatsappNumber;
}

function shouldHideDock(pathname: string) {
  return pathname.startsWith("/admin") || pathname === "/maintenance";
}

export default function PublicMobileDock() {
  const pathname = usePathname();
  const language = useSiteLanguage();
  const dockRef = useRef<HTMLDivElement>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [whatsappNumber, setWhatsappNumber] = useState(fallbackWhatsappNumber);
  const aiCopy = getAiSupportCopy(language);
  const cookieLabel = getCookieConsentCopy(language).settings;
  const quickNavOpenLabel = getStaticCopy(language, "quickNavOpen");
  const quickNavCloseLabel = getStaticCopy(language, "quickNavClose");
  const whatsappLabel = getStaticCopy(language, "whatsapp");

  useEffect(() => setOpenPanel(null), [pathname]);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const updateHeight = () => {
      const height = Math.ceil(dock.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--public-mobile-dock-height", `${height}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(dock);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
      document.documentElement.style.removeProperty("--public-mobile-dock-height");
    };
  }, [openPanel, language]);

  useEffect(() => {
    let mounted = true;
    async function loadWhatsappNumber() {
      if (!isSupabaseConfigured || !supabase) return;
      const { data } = await supabase.from("settings").select("setting_key, setting_value").eq("is_public", true).in("setting_key", whatsappSettingKeys);
      if (!mounted || !data) return;
      const rows = data as PublicSettingRow[];
      const configured = whatsappSettingKeys.map((key) => rows.find((row) => row.setting_key === key)?.setting_value || "").find((value) => value.trim());
      setWhatsappNumber(cleanWhatsappNumber(configured));
    }
    void loadWhatsappNumber();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!openPanel) return;
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenPanel(null); };
    const pointerdown = (event: PointerEvent) => {
      if (event.target instanceof Node && !dockRef.current?.contains(event.target)) setOpenPanel(null);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown);
    };
  }, [openPanel]);

  const whatsappHref = useMemo(() => `https://wa.me/${whatsappNumber}`, [whatsappNumber]);
  if (shouldHideDock(pathname)) return null;
  const closeLabel = openPanel === "ai" ? aiCopy.widgetClose : quickNavCloseLabel;
  const itemClass = "min-h-[44px] min-w-0 rounded-2xl px-1.5 py-2 text-[clamp(.58rem,2.45vw,.76rem)] font-black leading-tight focus-visible:outline-none focus-visible:ring-2";

  return (
    <div ref={dockRef} dir={getLanguageDirection(language)} className="hamza-mobile-dock-shell fixed inset-x-2 z-[180] print:hidden md:hidden" data-mobile-dock="public" data-testid="public-mobile-dock">
      {openPanel && (
        <div className="hamza-mobile-dock-panel absolute inset-x-0">
          {openPanel === "ai" ? (
            <PublicAiSupport open onOpenChange={(open) => setOpenPanel(open ? "ai" : null)} mobileDockMode panelId="hamza-mobile-ai-support-panel" />
          ) : (
            <PublicQuickNav open onOpenChange={(open) => setOpenPanel(open ? "quick-nav" : null)} mobileDockMode panelId="hamza-mobile-quick-nav-panel" />
          )}
        </div>
      )}
      <div className="hamza-mobile-dock-grid grid grid-cols-4 gap-1.5 rounded-[1.4rem] border border-white/10 bg-[#09000f]/96 p-2 shadow-[0_0_45px_rgba(124,58,237,.32)] backdrop-blur-xl">
        {openPanel ? (
          <button type="button" onClick={() => setOpenPanel(null)} className="col-span-4 min-h-[44px] rounded-2xl border border-white/15 bg-white/[.07] px-4 py-2 text-sm font-black text-white" aria-label={closeLabel}>{closeLabel}</button>
        ) : (
          <>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className={`${itemClass} flex items-center justify-center border border-green-300/30 bg-green-500/15 text-center text-green-100 focus-visible:ring-green-300/70`}><span className="min-w-0 text-balance break-words">{whatsappLabel}</span></a>
            <button type="button" onClick={() => setOpenPanel("ai")} className={`${itemClass} border border-fuchsia-300/30 bg-fuchsia-500/12 text-fuchsia-100 focus-visible:ring-fuchsia-300/70`} aria-label={aiCopy.widgetOpenAria} aria-controls="hamza-mobile-ai-support-panel" aria-expanded={false}><span className="text-balance break-words">{aiCopy.widgetOpen}</span></button>
            <button type="button" onClick={() => setOpenPanel("quick-nav")} className={`${itemClass} border border-yellow-300/30 bg-yellow-500/12 text-yellow-100 focus-visible:ring-yellow-300/70`} aria-label={quickNavOpenLabel} aria-controls="hamza-mobile-quick-nav-panel" aria-expanded={false}><span className="text-balance break-words">{quickNavOpenLabel}</span></button>
            <button type="button" onClick={() => window.dispatchEvent(new Event("hamza:cookie-settings"))} className={`${itemClass} border border-violet-300/30 bg-violet-500/12 text-violet-100 focus-visible:ring-violet-300/70`} aria-label={cookieLabel} data-testid="mobile-cookie-settings"><span className="text-balance break-words">{cookieLabel}</span></button>
          </>
        )}
      </div>
    </div>
  );
}
