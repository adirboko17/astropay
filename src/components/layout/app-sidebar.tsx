"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/app/login/actions";

const navItems = [
  {
    href: "/",
    label: "דשבורד",
    icon: DashboardIcon,
    exact: true,
  },
  {
    href: "/payplus",
    label: "PayPlus",
    icon: PayPlusIcon,
  },
  {
    href: "/customers",
    label: "לקוחות",
    icon: UsersIcon,
  },
  {
    href: "/projects",
    label: "פרויקטים",
    icon: ProjectsIcon,
  },
  {
    href: "/collections",
    label: "גבייה",
    icon: CollectionsIcon,
  },
  {
    href: "/tasks",
    label: "משימות",
    icon: TasksIcon,
  },
  {
    href: "/credentials",
    label: "פרטי התחברות",
    icon: KeyIcon,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="פתח תפריט"
        >
          <MenuIcon />
        </button>
        <Image
          src="/assets/astro-logo-11.png"
          alt="Astro Project"
          width={120}
          height={32}
          className="h-7 w-auto object-contain"
        />
        <div className="w-9" />
      </div>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="סגור תפריט"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 start-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-slate-950 transition-transform duration-200 lg:z-30 ${
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex justify-center border-b border-slate-800 px-5 py-4">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block">
            <Image
              src="/assets/astro-logo-09.png"
              alt="Astro Project"
              width={130}
              height={36}
              priority
              className="mx-auto h-7 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-bold tracking-wider text-slate-500">
            תפריט
          </p>
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-s-2 border-blue-500 bg-slate-800 text-white"
                    : "border-s-2 border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <Icon active={active} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
            >
              התנתקות
            </button>
          </form>
          <p className="mt-3 text-[11px] text-slate-500">PayPlus · Supabase</p>
        </div>
      </aside>
    </>
  );
}

function PayPlusIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6h13a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H4z" />
      <path d="M4 6v12" />
      <circle cx="14.5" cy="12" r="2.2" />
    </svg>
  );
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z" />
    </svg>
  );
}

function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 4.7a3.2 3.2 0 0 1 0 6.2" />
      <path d="M15 14.2c2.7.3 5 2.2 5 4.8" />
    </svg>
  );
}

function ProjectsIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function CollectionsIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6h13a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H4z" />
      <path d="M4 6v12" />
      <circle cx="14.5" cy="12" r="2.2" />
    </svg>
  );
}

function TasksIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M9 6h11M9 12h11M9 18h11" strokeLinecap="round" />
      <path d="m3.5 5.5 1 1L6.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.5 11.5 1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.5 17.5 1 1 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KeyIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9m2 0h3v3" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
