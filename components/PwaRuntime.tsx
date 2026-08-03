"use client";

import { useEffect, useState } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getPwaRuntimeCopy } from "@/lib/i18n/privacyAndPwaCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaRuntime() {
  const language = useSiteLanguage();
  const strings = getPwaRuntimeCopy(language);
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("appinstalled", markInstalled);

    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return () => {
        window.removeEventListener("beforeinstallprompt", captureInstall);
        window.removeEventListener("appinstalled", markInstalled);
      };
    }

    let refreshing = false;
    const controllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChange);
    const register = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const inspect = (worker: ServiceWorker | null) => {
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateWorker(worker);
        });
      };
      inspect(registration.installing);
      registration.addEventListener("updatefound", () => inspect(registration.installing));
      if (registration.waiting && navigator.serviceWorker.controller) setUpdateWorker(registration.waiting);
      window.setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000);
    };
    void register().catch(() => undefined);

    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstall);
      window.removeEventListener("appinstalled", markInstalled);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChange);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome !== "accepted") setInstallPrompt(null);
  }

  function update() {
    updateWorker?.postMessage({ type: "SKIP_WAITING" });
  }

  if (!updateWorker && (!installPrompt || installed)) return null;

  return (
    <div
      role="status"
      dir={getLanguageDirection(language)}
      data-testid="pwa-install-card"
      className="fixed left-3 right-3 z-[120] mx-auto max-w-[440px] overflow-hidden rounded-2xl border border-violet-300/30 bg-black/95 p-4 text-sm text-white shadow-2xl sm:left-1/2 sm:right-auto sm:w-[min(92vw,440px)] sm:-translate-x-1/2"
      style={{ bottom: "calc(var(--public-mobile-dock-clearance, 6rem) + 0.5rem)" }}
    >
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 break-words leading-6 text-balance" data-testid="pwa-install-copy">
          {updateWorker ? strings.updateAvailable : strings.installAvailable}
        </span>
        <button
          type="button"
          className="min-h-11 w-full flex-none rounded-xl bg-violet-600 px-4 font-bold sm:w-auto"
          onClick={updateWorker ? update : () => void install()}
          data-testid="pwa-install-action"
        >
          {updateWorker ? strings.updateButton : strings.installButton}
        </button>
      </div>
    </div>
  );
}
