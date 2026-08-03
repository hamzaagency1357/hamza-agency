"use client";

import { useEffect } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallState = {
  available: boolean;
  installed: boolean;
  outcome?: "accepted" | "dismissed";
};

const STATE_EVENT = "hamza:pwa-install-state";
const QUERY_EVENT = "hamza:pwa-install-query";
const REQUEST_EVENT = "hamza:pwa-install-request";

function isStandalone() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export default function PwaRuntime() {
  useEffect(() => {
    let deferredPrompt: InstallPromptEvent | null = null;
    let installed = isStandalone();
    let updateTimer = 0;

    const publish = (outcome?: InstallState["outcome"]) => {
      const detail: InstallState = { available: Boolean(deferredPrompt) && !installed, installed, outcome };
      window.dispatchEvent(new CustomEvent<InstallState>(STATE_EVENT, { detail }));
    };

    const captureInstall = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as InstallPromptEvent;
      publish();
    };

    const markInstalled = () => {
      installed = true;
      deferredPrompt = null;
      publish("accepted");
    };

    const answerQuery = () => publish();

    const requestInstall = () => {
      const promptEvent = deferredPrompt;
      if (!promptEvent || installed) {
        publish();
        return;
      }

      void (async () => {
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          deferredPrompt = null;
          installed = choice.outcome === "accepted" || isStandalone();
          publish(choice.outcome);
        } catch {
          deferredPrompt = null;
          publish("dismissed");
        }
      })();
    };

    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("appinstalled", markInstalled);
    window.addEventListener(QUERY_EVENT, answerQuery);
    window.addEventListener(REQUEST_EVENT, requestInstall);
    publish();

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        updateTimer = window.setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000);
      }).catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstall);
      window.removeEventListener("appinstalled", markInstalled);
      window.removeEventListener(QUERY_EVENT, answerQuery);
      window.removeEventListener(REQUEST_EVENT, requestInstall);
      if (updateTimer) window.clearInterval(updateTimer);
    };
  }, []);

  return null;
}
