import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";

import { PwaRegister } from "@/components/pwa/pwa-register";

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
  applicationName: "AsrtoPay",
  appleWebApp: {
    capable: true,
    title: "AsrtoPay",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  colorScheme: "light",
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
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
