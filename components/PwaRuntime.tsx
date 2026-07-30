"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaRuntime() {
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => { setInstalled(true); setInstallPrompt(null); };
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
    <div role="status" className="fixed bottom-24 left-1/2 z-[120] w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border border-violet-300/30 bg-black/95 p-4 text-sm text-white shadow-2xl" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>{updateWorker ? "يتوفر تحديث جديد وآمن للمنصة." : "يمكن تثبيت HAMZA AGENCY كتطبيق على جهازك."}</span>
        {updateWorker ? (
          <button type="button" className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold" onClick={update}>تحديث الآن</button>
        ) : (
          <button type="button" className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold" onClick={() => void install()}>تثبيت التطبيق</button>
        )}
      </div>
    </div>
  );
}
