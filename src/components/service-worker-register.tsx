"use client";
import { useEffect } from "react";

// Registers the service worker for offline shell + caching (PRD §88) in production.
// In dev we unregister any existing SW and clear its caches — a cache-first SW
// serves stale Next dev assets and breaks HMR/Tailwind rebuilds.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      if ("caches" in window) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
      return;
    }

    const onLoad = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);
  return null;
}
