import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AsrtoPay — ניהול עסק",
    short_name: "AsrtoPay",
    description: "מערכת פנימית לניהול הוראות קבע, לקוחות ופרטי התחברות",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "he",
    dir: "rtl",
    background_color: "#f4f6fb",
    theme_color: "#0b1220",
    categories: ["business", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
