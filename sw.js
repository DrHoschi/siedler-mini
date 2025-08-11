// sw.js – Siedler Mini V11.1
const CACHE_VERSION = 'v11.1.3';
const CACHE_NAME = `siedler-mini-${CACHE_VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './main.js',
  './manifest.webmanifest',
  // Assets – füge hier weitere Dateien ein, wenn du sie nutzt:
  './assets/hq_wood.png'
];

// Sofort installieren & Assets cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Alte Caches aufräumen und SW sofort aktiv machen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => (k !== CACHE_NAME) && caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Offline-first: zuerst Cache, dann Netzwerk
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Nur GET cachen
  if (req.method !== 'GET') return;

  // Für Navigationsanfragen (SPA/Pages) index.html zurückgeben (Fallback)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req);
          // Optional: frische Version in Cache legen
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, network.clone());
          return network;
        } catch {
          // offline → index.html aus Cache
          const cached = await caches.match('./index.html');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Für andere GET-Requests: Cache-then-Network
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) {
        // Im Hintergrund aktualisieren (stale-while-revalidate)
        fetch(req).then(async (res) => {
          if (res && res.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, res.clone());
          }
        }).catch(()=>{});
        return cached;
      }
      // Nicht im Cache → aus dem Netz holen und cachen
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      } catch {
        // Optional: hier ein Fallback-Bild/Seite liefern
        return Response.error();
      }
    })()
  );
});

// Optional: Manuelles Update anstoßen
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
