import type { MetadataRoute } from "next";
import { asset } from "@/lib/base-path";

export const dynamic = "force-static";

// Generated (not a static file) so start_url / scope / icons carry the basePath.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Istiqamah — Pendamping Shalat",
    short_name: "Istiqamah",
    description: "Bangun kebiasaan shalat, perlahan. Pengingat yang mempelajari polamu.",
    start_url: asset("/today"),
    scope: asset("/"),
    display: "standalone",
    orientation: "portrait",
    lang: "id",
    dir: "ltr",
    background_color: "#0e1512",
    theme_color: "#0e1512",
    categories: ["lifestyle", "health"],
    icons: [
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: asset("/icon.svg"), type: "image/svg+xml", sizes: "any" },
    ],
  };
}
