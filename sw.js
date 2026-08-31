// Service worker — offline shell + caching (PRD §88–89) and Web Push (§87).
// Navigations are network-first (stays fresh in dev, falls back to cache offline);
// hashed static assets are cache-first (immutable).
const CACHE = "istq-v1";
// Works under any basePath (e.g. "/istiqamah" on GitHub Pages) — derived from
// where this sw.js is served rather than hard-coded absolute paths.
const BASE = self.location.pathname.replace(/\/sw\.js$/, "");

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([`${BASE}/icon.svg`, `${BASE}/icon-192.png`]).catch(() => {})),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);

  if (isStatic) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) c.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          const c = await caches.open(CACHE);
          c.put(request, res.clone());
          return res;
        } catch {
          const c = await caches.open(CACHE);
          return (await c.match(request)) || (await c.match(`${BASE}/today`)) || Response.error();
        }
      })(),
    );
  }
});

// ── Web Push (PRD §87) ───────────────────────────────────────────────────────
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { title: "Istiqamah", body: e.data && e.data.text() };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "Istiqamah", {
      body: d.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: d.tag,
      data: d.data || {},
      vibrate: d.vibrate,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || `${BASE}/today`;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) if ("focus" in c) return c.navigate(target).then((x) => x && x.focus());
      return self.clients.openWindow(target);
    }),
  );
});
