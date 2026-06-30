import { AppShellClient } from "@/components/layout/app-shell-client";

interface AppShellProps {
  title?: string;
  description?: string;
  wide?: boolean;
  hideHeader?: boolean;
  children: React.ReactNode;
}

export function AppShell(props: AppShellProps) {
  return <AppShellClient {...props} />;
}
