import type { Metadata } from "next";
import { Heebo } from "next/font/google";

import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AsrtoPay — ניהול עסק",
  description: "מערכת פנימית לניהול הוראות קבע, לקוחות ופרטי התחברות",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className={`${heebo.className} min-h-screen bg-[var(--background)] font-sans text-slate-900 antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
