import type { MetadataRoute } from "next"

// Web app manifest: lets phones install Book Buddy and launch it full-screen.
// Icons are rendered from the two-circle mark by app/pwa-icon/[size]/route.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Book Buddy",
    short_name: "Book Buddy",
    description: "Read, listen and ask Varta — your digital library, installed.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0A0F24",
    theme_color: "#0A0F24",
    lang: "en",
    categories: ["education", "books"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Library", url: "/catalog", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: "Ask Varta", url: "/varta", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: "Listen", url: "/catalog?format=AUDIOBOOK", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
    ],
  }
}
