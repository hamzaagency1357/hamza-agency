"use client";

import { useEffect, useState } from "react";

export default function PwaRuntime() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let registration: ServiceWorkerRegistration | undefined;
    const register = async () => {
      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      registration.addEventListener("updatefound", () => {
        const worker = registration?.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true);
        });
      });
    };
    void register().catch(() => undefined);
    return () => registration?.unregister;
  }, []);

  if (!updateReady) return null;
  return (
    <div role="status" className="fixed bottom-24 left-1/2 z-[120] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-violet-300/30 bg-black/95 p-4 text-sm text-white shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <span>يتوفر تحديث جديد للمنصة.</span>
        <button className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold" onClick={() => window.location.reload()}>تحديث</button>
      </div>
    </div>
  );
}
