import { AppSidebar } from "@/components/layout/app-sidebar";

interface AppShellProps {
  title: string;
  description?: string;
  wide?: boolean;
  children: React.ReactNode;
}

export function AppShell({
  title,
  description,
  wide = false,
  children,
}: AppShellProps) {
  const contentClass = wide ? "max-w-none" : "max-w-7xl";

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className={`mx-auto ${contentClass}`}>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
        </header>

        <main className={`mx-auto w-full flex-1 ${contentClass} px-4 py-6 sm:px-6 lg:px-8`}>
          {children}
        </main>
      </div>
    </div>
  );
}
