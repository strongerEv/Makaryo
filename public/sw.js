/* Service worker Makaryo — menangani web push dan pemasangan PWA. */

const CACHE_NAME = "makaryo-v1";
const OFFLINE_ASSETS = ["/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

// Aset statis dilayani dari cache; halaman selalu diambil dari jaringan
// supaya data absensi dan jadwal tidak pernah basi.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith("/icons/") && url.pathname !== "/manifest.webmanifest") return;

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

self.addEventListener("push", (event) => {
  let payload = { title: "Makaryo", body: "Ada pembaruan baru." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  const urgent = Boolean(payload.urgent);

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "makaryo",
      renotify: true,
      requireInteraction: urgent,
      silent: false,
      // Getar panjang khusus pengingat jam kerja.
      vibrate: urgent ? [400, 150, 400, 150, 400] : [200, 100, 200],
      data: { link: payload.link || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
