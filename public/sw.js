const CACHE_VERSION = "hamza-public-v1";
const OFFLINE_URL = "/offline";
const PUBLIC_SHELL = ["/", "/offline", "/manifest.webmanifest"];
const NEVER_CACHE = ["/admin", "/portal", "/api", "/auth", "/application-status", "/service-status"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PUBLIC_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function canCache(request, url) {
  if (request.method !== "GET") return false;
  if (request.headers.get("authorization") || request.headers.get("cookie")) return false;
  if (NEVER_CACHE.some((prefix) => url.pathname.startsWith(prefix))) return false;
  return url.origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!canCache(event.request, url)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && response.headers.get("cache-control")?.includes("public")) {
            const clone = response.clone();
            event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone)));
          }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || (await caches.match(OFFLINE_URL))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok && ["style", "script", "image", "font"].includes(event.request.destination)) {
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
  let payload = { title: "HAMZA AGENCY", body: "لديك تحديث جديد.", url: "/portal/login" };
  try {
    const incoming = event.data?.json();
    payload = {
      title: incoming?.title || payload.title,
      body: incoming?.body || payload.body,
      url: incoming?.url?.startsWith("/") ? incoming.url : payload.url,
    };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/Logo%20hamza%20agency.jpg",
      badge: "/Logo%20hamza%20agency.jpg",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/portal/login";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => new URL(client.url).pathname === target);
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});
