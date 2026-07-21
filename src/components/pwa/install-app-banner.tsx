"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setHidden(true);
      return;
    }

    const dismissed = localStorage.getItem("asrtopay-pwa-install-dismissed");
    if (dismissed === "1") {
      setHidden(true);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (hidden || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setHidden(true);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem("asrtopay-pwa-install-dismissed", "1");
    setHidden(true);
    setDeferredPrompt(null);
  }

  return (
    <div
      role="region"
      aria-label="התקנת אפליקציה"
      className="fixed bottom-4 start-4 z-50 max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg lg:start-auto lg:end-6"
    >
      <p className="text-sm font-semibold text-slate-900">התקנה על שולחן העבודה</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        התקן את AsrtoPay כאפליקציה — נפתחת בחלון נפרד, כמו תוכנה במחשב.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-lg bg-[var(--sidebar)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          התקן
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          לא עכשיו
        </button>
      </div>
    </div>
  );
}
