/* Siedler‑Mini • tools/map-runtime.js
 * Lädt eine Map-JSON, den Tileset-Atlas (JSON + PNG) und bereitet
 * die Struktur für das Rendern vor.
 * Alles „vanilla“, keine Module.
*/
(function () {
  const now = () => performance.now().toFixed(0);

  // ---- helpers -------------------------------------------------------------

  function absoluteUrl(base, relOrAbs){
    try { return new URL(relOrAbs, base).toString(); }
    catch { return relOrAbs; }
  }

  async function fetchJson(url){
    const t0 = performance.now();
    const res = await fetch(url, { cache:'no-store' });
    const ms = Math.max(1, performance.now() - t0 | 0);
    if(!res.ok){
      const text = await res.text().catch(()=>`HTTP ${res.status}`);
      const err = new Error(`[net] ${res.status} ${url} (${ms}ms)\n${text.slice(0,240)}`);
      err.code = res.status;
      throw err;
    }
    try{
      const data = await res.json();
      return { data, ms };
    }catch(parseErr){
      const raw = await res.text().catch(()=>'(kein Body)');
      const err = new Error(`SyntaxError beim Parsen von JSON:\n${url}\n${parseErr.message}\n--- body ---\n${raw.slice(0,400)}`);
      err.code = 'JSON';
      throw err;
    }
  }

  function loadImage(url){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = ()=> resolve(img);
      img.onerror = ()=> reject(new Error(`Bild konnte nicht geladen werden: ${url}`));
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    });
  }

  // ---- public API ----------------------------------------------------------

  async function loadAndPrepareMap(mapUrl, hooks = {}){
    const { onNet, onAtlas, log } = hooks;
    const t0 = performance.now();
    const absMapUrl = absoluteUrl(location.href, mapUrl);

    const { data: map, ms: msMap } = await fetchJson(absMapUrl);
    onNet && onNet(absMapUrl, 200, msMap);

    // Basis prüfen
    if(!map || !map.layers || !Array.isArray(map.layers)){
      throw new Error('Ungültiges Map-Format: "layers" fehlt/ist nicht Array.');
    }
    if(!map.tileSize) map.tileSize = 64;

    // Atlas-Pfade (relativ zur Map-Datei)
    const baseUrl = absMapUrl.replace(/[^/]+$/, ''); // ohne Dateiname
    const atlasJsonUrl  = absoluteUrl(baseUrl, map.atlas?.json  || '../tiles/tileset.json');
    const atlasImageUrl = absoluteUrl(baseUrl, map.atlas?.image || '../tiles/tileset.png');

    onAtlas && onAtlas('base', baseUrl);
    onAtlas && onAtlas('json',  `${map.atlas?.json  || '../tiles/tileset.json'} → ${atlasJsonUrl}`);
    onAtlas && onAtlas('image', `${map.atlas?.image || '../tiles/tileset.png'} → ${atlasImageUrl}`);

    // Tileset JSON + PNG laden
    const { data: tileset, ms: msTs } = await fetchJson(atlasJsonUrl);
    onNet && onNet(atlasJsonUrl, 200, msTs);

    if(!tileset.frames || !tileset.tileSize){
      throw new Error('Ungültiges Tileset: "frames" oder "tileSize" fehlt.');
    }
    const img = await loadImage(atlasImageUrl);
    onNet && onNet(atlasImageUrl, 200, Math.max(1, performance.now() - t0 | 0));

    // Größe aus erster Grid-Layer ableiten
    const gridLayer = map.layers.find(l => l.type === 'grid');
    const rows = gridLayer?.grid?.length || 0;
    const cols = rows ? gridLayer.grid[0].length : 0;

    // Frames in schnelles Lookup umwandeln
    const frames = tileset.frames;     // { key: {x,y,w,h} }
    const tileSize = tileset.tileSize; // px

    return {
      meta: { source: absMapUrl, loadedAt: Date.now() },
      map, tileset,
      atlas: { image: img, frames, tileSize },
      cols, rows, tileSize: map.tileSize || tileSize,
      layers: map.layers
    };
  }

  // exportieren
  window.SMINI = window.SMINI || {};
  window.SMINI.loadAndPrepareMap = loadAndPrepareMap;
})();
