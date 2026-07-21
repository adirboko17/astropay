"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/app/login/actions";
import { startNavigationProgress } from "@/components/layout/navigation-progress";

const dashboardItem = {
  href: "/",
  label: "דשבורד",
  icon: DashboardIcon,
  exact: true,
};

const paymentItems = [
  {
    href: "/collections",
    label: "גבייה",
    icon: CollectionsIcon,
  },
  {
    href: "/payplus",
    label: "PayPlus",
    icon: PayPlusIcon,
  },
];

const workspaceItems = [
  {
    href: "/customers",
    label: "לקוחות",
    icon: UsersIcon,
  },
  {
    href: "/projects",
    label: "פרוייקטים",
    icon: ProjectsIcon,
  },
  {
    href: "/tasks",
    label: "משימות",
    icon: TasksIcon,
  },
];

const tableItems = [
  {
    href: "/credentials",
    label: "פרטי התחברות",
    icon: KeyIcon,
  },
  {
    href: "/env",
    label: "ENV",
    icon: EnvIcon,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(
    () => paymentItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  const [tablesOpen, setTablesOpen] = useState(
    () => tableItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );

  function isActive(item: { href: string; exact?: boolean }) {
    return item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function navLink(
    item: {
      href: string;
      label: string;
      icon: ({ active }: { active: boolean }) => React.ReactNode;
      exact?: boolean;
    },
    nested = false,
  ) {
    const active = isActive(item);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={true}
        onClick={() => {
          setMobileOpen(false);
          startNavigationProgress();
        }}
        className={`flex items-center gap-3 rounded-lg text-sm font-medium transition ${
          nested ? "ms-4 px-3 py-2" : "px-3 py-2.5"
        } ${
          active
            ? "border-s-2 border-blue-500 bg-slate-800 text-white"
            : "border-s-2 border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
        }`}
      >
        <Icon active={active} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {active && nested ? <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> : null}
      </Link>
    );
  }

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
          {navLink(dashboardItem)}

          <SidebarGroup
            label="תשלומים"
            icon={PaymentsGroupIcon}
            open={paymentsOpen}
            active={paymentItems.some(isActive)}
            onToggle={() => setPaymentsOpen((current) => !current)}
          >
            {paymentItems.map((item) => navLink(item, true))}
          </SidebarGroup>

          {workspaceItems.map((item) => navLink(item))}

          <SidebarGroup
            label="טבלאות"
            icon={TablesGroupIcon}
            open={tablesOpen}
            active={tableItems.some(isActive)}
            onToggle={() => setTablesOpen((current) => !current)}
          >
            {tableItems.map((item) => navLink(item, true))}
          </SidebarGroup>
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

function SidebarGroup({
  label,
  icon: Icon,
  open,
  active,
  onToggle,
  children,
}: {
  label: string;
  icon: ({ active }: { active: boolean }) => React.ReactNode;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-lg border-s-2 px-3 py-2.5 text-sm font-semibold transition ${
          active
            ? "border-blue-500/70 bg-slate-900 text-slate-100"
            : "border-transparent text-slate-300 hover:bg-slate-900 hover:text-white"
        }`}
      >
        <Icon active={active} />
        <span className="min-w-0 flex-1 text-start">{label}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div className="relative mt-1 space-y-1 pb-1">
          <span className="absolute inset-y-1 start-[22px] w-px bg-slate-800" aria-hidden="true" />
          {children}
        </div>
      ) : null}
    </div>
  );
}

function PaymentsGroupIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" strokeLinecap="round" />
    </svg>
  );
}

function TablesGroupIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11M15 9v11" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function EnvIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 6h8l2 4v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10l2-4Z" strokeLinejoin="round" />
      <path d="M8 10h8M10 14h4" strokeLinecap="round" />
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
