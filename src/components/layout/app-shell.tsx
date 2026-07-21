"use client";

import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

const WIDE_PATH_MATCHERS = [/^\/credentials(\/|$)/, /^\/customers\/[^/]+$/];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const wide = WIDE_PATH_MATCHERS.some((pattern) => pattern.test(pathname));
  const contentClass = wide ? "max-w-none" : "max-w-7xl";

  return (
    <div className="min-h-screen bg-slate-100">
      <AppSidebar />

      <div className="flex min-w-0 flex-col lg:ms-64 lg:h-screen lg:overflow-y-auto">
        <main className={`mx-auto w-full flex-1 ${contentClass} px-4 py-6 sm:px-6 lg:px-8`}>
          {children}
        </main>
      </div>
    </div>
  );
}
