/* Book Buddy service worker.
 *
 * Caches the app SHELL (hashed JS/CSS/font files under /_next/static, icons, the offline
 * page) so the PWA opens instantly and degrades gracefully offline.
 *
 * It deliberately does NOT cache navigations, API calls or anything under /api: pages are
 * per-user, and a cached page must never be shown to the next person on a shared phone.
 * When a navigation fails offline, the pre-cached /offline page is shown instead.
 */
const VERSION = "bb-v1"
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`
const PRECACHE = ["/offline", "/favicon.svg", "/pwa-icon/192", "/pwa-icon/512"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const isFont = (request, url) =>
  request.destination === "font" || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com"

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const res = await fetch(request)
  if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone())
  return res
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone())
      return res
    })
    .catch(() => hit)
  return hit || network
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET" || request.headers.has("range")) return
  const url = new URL(request.url)

  // Fonts (self-hosted by next/font and Google-hosted Devanagari) — stale-while-revalidate.
  if (isFont(request, url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
    return
  }

  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api/")) return

  // Hashed build assets never change for a given URL.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // App icons.
  if (url.pathname.startsWith("/pwa-icon/") || url.pathname === "/favicon.svg") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }

  // Navigations: network only, with the offline page as the fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((r) => r || Response.error()))
    )
  }
})
