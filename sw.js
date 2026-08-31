// Eidos — cache applicatif. Changez CACHE a chaque publication.
const CACHE = "eidos-v4";
const FICHIERS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./apple-touch-icon.png", "./icone-192.png", "./icone-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(rep => {
      if (rep.ok && new URL(e.request.url).origin === location.origin)
        caches.open(CACHE).then(c => c.put(e.request, rep.clone()));
      return rep;
    }).catch(() => caches.match("./index.html")))
  );
});
