"use client";

import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";

interface AppShellClientProps {
  title?: string;
  description?: string;
  wide?: boolean;
  hideHeader?: boolean;
  children: React.ReactNode;
}

export function AppShellClient({
  title,
  description,
  wide = false,
  hideHeader = false,
  children,
}: AppShellClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const contentClass = wide ? "max-w-none" : "max-w-7xl";
  const showDesktopHeader = !hideHeader && (title || description);
  const mobileTitle = title ?? "AsrtoPay";

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <AppSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/80 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:bg-slate-200"
            aria-label="פתח תפריט"
            aria-expanded={mobileOpen}
          >
            <MenuIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-slate-900">
              {mobileTitle}
            </p>
            {description ? (
              <p className="truncate text-xs leading-tight text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </header>

        {showDesktopHeader ? (
          <header className="hidden border-b border-slate-200 bg-white px-6 py-5 lg:block lg:px-8">
            <div className={`mx-auto ${contentClass}`}>
              {title ? (
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              ) : null}
            </div>
          </header>
        ) : null}

        <main
          className={`mx-auto w-full flex-1 ${contentClass} px-3 py-4 sm:px-6 sm:py-6 lg:px-8`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
