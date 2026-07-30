const CACHE_VERSION = "hamza-public-v2";
const OFFLINE_URL = "/offline";
const PUBLIC_SHELL = ["/", "/offline", "/manifest.webmanifest", "/cookie-policy", "/status"];
const NEVER_CACHE = [
  "/admin",
  "/portal",
  "/api",
  "/auth",
  "/track",
  "/application-status",
  "/service-status",
  "/job-status",
  "/contact-status",
  "/marketplace/checkout",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PUBLIC_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function hasPrivateSignals(request) {
  return Boolean(
    request.headers.get("authorization") ||
    request.headers.get("cookie") ||
    request.headers.get("x-supabase-auth")
  );
}

function canCache(request, url) {
  if (request.method !== "GET") return false;
  if (hasPrivateSignals(request)) return false;
  if (NEVER_CACHE.some((prefix) => url.pathname.startsWith(prefix))) return false;
  return url.origin === self.location.origin;
}

function publicResponse(response) {
  const cacheControl = response.headers.get("cache-control") || "";
  return response.ok && !/private|no-store/i.test(cacheControl) && !response.headers.has("set-cookie");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!canCache(event.request, url)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (publicResponse(response)) {
            const clone = response.clone();
            event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone)));
          }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || (await caches.match(OFFLINE_URL))),
    );
    return;
  }

  if (!["style", "script", "image", "font", "manifest"].includes(event.request.destination)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (publicResponse(response)) {
          const clone = response.clone();
          event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone)));
        }
        return response;
      });
      return cached || network;
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "HAMZA AGENCY", body: "لديك تحديث جديد داخل المنصة.", url: "/portal/login", sensitive: true };
  try {
    const incoming = event.data?.json();
    payload = {
      title: String(incoming?.title || payload.title).slice(0, 80),
      body: incoming?.sensitive === false ? String(incoming?.body || "").slice(0, 160) : payload.body,
      url: typeof incoming?.url === "string" && incoming.url.startsWith("/") ? incoming.url.slice(0, 300) : payload.url,
      sensitive: incoming?.sensitive !== false,
    };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/Logo%20hamza%20agency.jpg",
      badge: "/Logo%20hamza%20agency.jpg",
      data: { url: payload.url },
      tag: "hamza-agency-update",
      renotify: false,
    }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(self.registration.pushManager.subscribe(event.oldSubscription?.options || { userVisibleOnly: true }).catch(() => undefined));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = typeof event.notification.data?.url === "string" && event.notification.data.url.startsWith("/")
    ? event.notification.data.url
    : "/portal/login";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => new URL(client.url).pathname === target);
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});
