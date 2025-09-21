// sw.js – sehr schlanker Cache für statische Assets
// erhöhe VERSION bei jeder inhaltlichen Änderung, um alte Caches loszuwerden
const VERSION = 'v14.1';
const CACHE = `siedler-mini-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './boot.js',
  './main.js',
  './render.js',
  './game.js',
  './core/assets.js',
  './core/input.js',
  './core/camera.js',
  './core/carriers.js',
  // Texturen (werden nur gecacht, wenn vorhanden)
  './assets/grass.png',
  './assets/water.png',
  './assets/shore.png',
  './assets/dirt.png',
  './assets/road.png',
  './assets/road_straight.png',
  './assets/road_curve.png',
  './assets/hq_stone.png',
  './assets/hq_wood.png',
  './assets/lumberjack.png',
  './assets/depot.png',
  './assets/rocky.png',
  './assets/sand.png',
  './assets/carrier.png',
];

self.addEventListener('install', (e)=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c=> c.addAll(ASSETS.map(a => new Request(a, {cache:'reload'})))).catch(()=>{})
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e)=>{
  const {request} = e;
  if (request.method !== 'GET') return;
  e.respondWith((async ()=>{
    const cached = await caches.match(request);
    if (cached) return cached;
    try{
      const fresh = await fetch(request);
      // nur statische Sachen cachen (gleiche Origin)
      if (new URL(request.url).origin === location.origin) {
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone());
      }
      return fresh;
    }catch{
      // offline‑Fallback: index.html
      if (request.mode === 'navigate') return caches.match('./index.html');
      throw;
    }
  })());
});
