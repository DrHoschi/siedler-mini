// tools/map-runtime.js
// ------------------------------------------------------------
// Lädt Map-JSON und (optional) Tileset-Atlas (JSON + PNG).
// Gibt ein 'world' Objekt zurück, das der Renderer verwenden kann.
// Fehler sind sprechend und werden nach oben geworfen.

export async function loadAndPrepareMap(mapUrl, hooks = {}) {
  const t0 = performance.now();
  const onNet   = hooks.onNet   || (()=>{});
  const onAtlas = hooks.onAtlas || (()=>{});
  const log     = hooks.log     || (()=>{});

  log('game', `Lade Karte:\n${new URL(mapUrl, location.href).toString()}`);

  // Map-JSON laden
  const map = await fetchJson(mapUrl, onNet);

  // Basis-URL (Ordner der Map)
  const base = new URL('.', new URL(mapUrl, location.href)).toString();
  onAtlas('base', base);

  let tilesetJson = null;
  let tilesetImg  = null;

  // Optionales Atlas-Objekt (relativ zur Map)
  if (map && map.atlas && (map.atlas.json || map.atlas.image)) {
    const jsonUrl  = map.atlas.json  ? new URL(map.atlas.json,  base).toString() : null;
    const imageUrl = map.atlas.image ? new URL(map.atlas.image, base).toString() : null;

    if (jsonUrl)  onAtlas('json',  `${map.atlas.json} → ${jsonUrl}`);
    if (imageUrl) onAtlas('image', `${map.atlas.image} → ${imageUrl}`);

    try {
      if (jsonUrl)  tilesetJson = await fetchJson(jsonUrl, onNet);
      if (imageUrl) tilesetImg  = await loadImage(imageUrl, onNet);
    } catch (err) {
      log('game', 'Atlas konnte nicht geladen werden — fahre ohne Atlas fort.');
      // Wir lassen weiterlaufen; Renderer fällt auf Grid zurück.
    }
  } else {
    log('game', 'Kein Atlas in Map angegeben — fahre ohne Atlas fort.');
  }

  const t1 = performance.now();
  log('boot', `preGameInit OK • Tiles geladen in ${(t1 - t0).toFixed(0)}ms`);

  return {
    map, base,
    tileset: tilesetJson,
    tilesetImage: tilesetImg
  };
}

async function fetchJson(url, onNet) {
  const t0 = performance.now();
  const res = await fetch(url, { cache: 'no-store' });
  const ms = Math.max(1, (performance.now() - t0) | 0);
  onNet(url, res.status, ms);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} beim Laden: ${url}`);
  }
  let text = await res.text();

  // JSON darf KEINE Kommentare enthalten – im Zweifel Fehlermeldung verbessern:
  try {
    return JSON.parse(text);
  } catch (e) {
    const snippet = text.slice(0, 300).replace(/\s+/g, ' ');
    throw new Error(`Ungültiges JSON in ${url}: ${e.message}\nAuszug: ${snippet}`);
  }
}

function loadImage(url, onNet) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ms = Math.max(1, (performance.now() - t0) | 0);
      onNet(url, 200, ms);
      resolve(img);
    };
    img.onerror = () => {
      const ms = Math.max(1, (performance.now() - t0) | 0);
      onNet(url, 0, ms);
      reject(new Error(`Bild konnte nicht geladen werden: ${url}`));
    };
    img.src = url + (url.includes('?') ? '&' : '?') + 'bust=' + Date.now();
  });
}
