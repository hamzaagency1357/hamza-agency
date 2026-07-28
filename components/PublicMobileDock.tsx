"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import PublicAiSupport from "@/components/PublicAiSupport";
import PublicQuickNav from "@/components/PublicQuickNav";
import { getAiSupportCopy } from "@/lib/i18n/aiSupport";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type OpenPanel = "ai" | "quick-nav" | null;
type PublicSettingRow = {
  setting_key: string | null;
  setting_value: string | null;
};

const fallbackWhatsappNumber = "905011730377";
const whatsappSettingKeys = [
  "primary_whatsapp",
  "whatsapp",
  "support_whatsapp",
];

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
  const [whatsappNumber, setWhatsappNumber] = useState(
    fallbackWhatsappNumber
  );
  const aiCopy = getAiSupportCopy(language);
  const quickNavOpenLabel = getStaticCopy(language, "quickNavOpen");
  const quickNavCloseLabel = getStaticCopy(language, "quickNavClose");
  const whatsappLabel = getStaticCopy(language, "whatsapp");

  useEffect(() => {
    setOpenPanel(null);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function loadWhatsappNumber() {
      if (!isSupabaseConfigured || !supabase) return;

      const { data } = await supabase
        .from("settings")
        .select("setting_key, setting_value")
        .eq("is_public", true)
        .in("setting_key", whatsappSettingKeys);

      if (!isMounted || !data) return;

      const rows = data as PublicSettingRow[];
      const configuredValue = whatsappSettingKeys
        .map(
          (key) =>
            rows.find((row) => row.setting_key === key)?.setting_value || ""
        )
        .find((value) => value.trim().length > 0);

      setWhatsappNumber(cleanWhatsappNumber(configuredValue));
    }

    void loadWhatsappNumber();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!openPanel) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPanel(null);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!dockRef.current?.contains(target)) {
        setOpenPanel(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openPanel]);

  const whatsappHref = useMemo(
    () => `https://wa.me/${whatsappNumber}`,
    [whatsappNumber]
  );

  if (shouldHideDock(pathname)) return null;

  const closeLabel =
    openPanel === "ai" ? aiCopy.widgetClose : quickNavCloseLabel;

  return (
    <div
      ref={dockRef}
      dir={getLanguageDirection(language)}
      className="hamza-mobile-dock-shell fixed inset-x-2 z-[180] print:hidden md:hidden"
      data-mobile-dock="public"
    >
      {openPanel && (
        <div className="hamza-mobile-dock-panel absolute inset-x-0">
          {openPanel === "ai" ? (
            <PublicAiSupport
              open
              onOpenChange={(open) => setOpenPanel(open ? "ai" : null)}
              mobileDockMode
              panelId="hamza-mobile-ai-support-panel"
            />
          ) : (
            <PublicQuickNav
              open
              onOpenChange={(open) =>
                setOpenPanel(open ? "quick-nav" : null)
              }
              mobileDockMode
              panelId="hamza-mobile-quick-nav-panel"
            />
          )}
        </div>
      )}

      <div className="hamza-mobile-dock-grid grid h-full grid-cols-3 gap-2 rounded-[1.4rem] border border-white/10 bg-[#09000f]/96 p-2 shadow-[0_0_45px_rgba(124,58,237,0.32)] backdrop-blur-xl">
        {openPanel ? (
          <button
            type="button"
            onClick={() => setOpenPanel(null)}
            className="col-span-3 min-h-[44px] rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-2 text-sm font-black text-white transition hover:border-purple-300/45 hover:bg-purple-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70"
            aria-label={closeLabel}
          >
            {closeLabel}
          </button>
        ) : (
          <>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[44px] min-w-0 items-center justify-center rounded-2xl border border-green-300/30 bg-green-500/15 px-2 py-2 text-center text-[clamp(0.68rem,2.8vw,0.82rem)] font-black leading-tight text-green-100 transition hover:bg-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300/70"
            >
              <span className="min-w-0 text-balance break-words">
                {whatsappLabel}
              </span>
            </a>

            <button
              type="button"
              onClick={() => setOpenPanel("ai")}
              className="min-h-[44px] min-w-0 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/12 px-2 py-2 text-[clamp(0.68rem,2.8vw,0.82rem)] font-black leading-tight text-fuchsia-100 transition hover:bg-fuchsia-500/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/70"
              aria-label={aiCopy.widgetOpenAria}
              aria-controls="hamza-mobile-ai-support-panel"
              aria-expanded={false}
            >
              <span className="text-balance break-words">
                {aiCopy.widgetOpen}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOpenPanel("quick-nav")}
              className="min-h-[44px] min-w-0 rounded-2xl border border-yellow-300/30 bg-yellow-500/12 px-2 py-2 text-[clamp(0.68rem,2.8vw,0.82rem)] font-black leading-tight text-yellow-100 transition hover:bg-yellow-500/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/70"
              aria-label={quickNavOpenLabel}
              aria-controls="hamza-mobile-quick-nav-panel"
              aria-expanded={false}
            >
              <span className="text-balance break-words">
                {quickNavOpenLabel}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
