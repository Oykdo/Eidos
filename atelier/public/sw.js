/** Tue l'ancien cache eidos-v6. Pas de fetch : le réseau gagne. */
self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      const cs = await self.clients.matchAll({ type: "window" });
      for (const c of cs) c.navigate(c.url);
    })(),
  );
});
