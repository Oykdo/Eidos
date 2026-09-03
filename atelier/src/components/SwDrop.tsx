import { useEffect } from "react";

const BASE = import.meta.env.BASE_URL;

/** Force la mise à jour de l'ancien sw.js (PWA v6) et vide le cache. */
export function SwDrop() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register(`${BASE}sw.js`);
        await reg.update();
      } catch {
        /* */
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    })();
  }, []);
  return null;
}
