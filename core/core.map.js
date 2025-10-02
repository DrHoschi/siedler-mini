/* ============================================================================
 * Datei: core/core.map.js
 * Version: v18.0.0
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Tileset (JSON + PNG) laden
 *  - Map laden (JSON-Format wie map-mini.json)
 *  - Auf 'cb:render-frame' zeichnen (Layer "ground" → Tiles)
 *
 * API:
 *  - Game.Map.loadFromUrl(url)
 *  - Game.Map.load(mapJsonObject)
 *
 * Hinweise:
 *  - Nutzt die vom Renderer gesetzte Welt-Transform (ctx bereits transformiert).
 *  - Markiert nach erfolgreichem Zeichnen das Frame via detail.markDrawn().
 * ============================================================================ */
(() => {
  'use strict';

  const MOD  = '[map]';
  const info = (window.CBLog?.info || console.log).bind(console, MOD);
  const ok   = (window.CBLog?.ok   || console.log).bind(console, MOD);
  const warn = (window.CBLog?.warn || console.warn).bind(console, MOD);
  const err  = (window.CBLog?.err  || console.error).bind(console, MOD);

  // ---- State --------------------------------------------------------------
  let tileset = null;  // { json, image, tileSize }
  let map     = null;  // { width, height, tileSize, tileset, layers: [...] }

  // ---- Helpers ------------------------------------------------------------
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    return res.json();
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('Bild nicht erreichbar: ' + src));
      img.src = src;
    });
  }

  // ---- Tileset laden ------------------------------------------------------
  async function loadTileset() {
    const candidates = [
      'assets/tiles/tileset.terrain.json',
      'assets/tiles/tileset.json'
    ];
    let atlas = null, chosen = null;
    for (const url of candidates) {
      try {
        atlas = await fetchJSON(url);
        chosen = url;
        break;
      } catch (e) {
        warn('Tileset-Kandidat verworfen:', url, '→', e.message);
      }
    }
    if (!atlas) throw new Error('Tileset nicht erreichbar.');

    const imagePath = atlas?.meta?.image;
    if (!imagePath) throw new Error('Tileset.meta.image fehlt.');

    const img = await loadImage(imagePath);

    tileset = {
      json     : atlas,
      image    : img,
      tileSize : atlas?.meta?.tileSize || atlas?.meta?.tile || 64,
      frames   : atlas.frames || {}
    };
    ok('Tileset geladen:', chosen, `(Frames: ${Object.keys(tileset.frames).length})`);
  }

  // ---- Map laden ----------------------------------------------------------
  async function loadMapFromUrl(url) {
    const data = await fetchJSON(url);
    await load(data);
  }

  async function load(data) {
    if (!tileset) await loadTileset();

    map = data;
    // Fallback TileSize aus Map (falls gesetzt)
    if (Number.isFinite(map?.tileSize)) {
      tileset.tileSize = map.tileSize;
    }
    ok(`Map geladen: ${map.width}×${map.height} @ ${tileset.tileSize}`);
  }

  // ---- Zeichnen -----------------------------------------------------------
  function drawGroundLayer(ctx) {
    if (!map || !tileset) return false;

    const layer = (map.layers || []).find(l => l.type === 'tiles' && l.name === 'ground');
    if (!layer || !Array.isArray(layer.data)) return false;

    const T = tileset.tileSize;
    const frames = tileset.frames;

    // Vollständig zeichnen (Map ist klein). Später: Sichtfenster cull'en.
    for (let r = 0; r < layer.data.length; r++) {
      const row = layer.data[r];
      for (let c = 0; c < row.length; c++) {
        const key = row[c];
        if (!key) continue;
        const f = frames[key];
        if (!f) continue; // Unbekannter Frame → überspringen

        const dx = c * T;
        const dy = r * T;
        ctx.drawImage(tileset.image, f.x, f.y, f.w, f.h, dx, dy, T, T);
      }
    }
    return true;
  }

  // Render-Hook
  function onRenderFrame(ev) {
    try {
      const { ctx, markDrawn } = ev.detail || {};
      if (!ctx) return;

      const drawn = drawGroundLayer(ctx);
      if (drawn && typeof markDrawn === 'function') markDrawn();
    } catch (e) {
      err('onRenderFrame:', e.message || e);
    }
  }

  // ---- Public API ---------------------------------------------------------
  window.Game = window.Game || {};
  window.Game.Map = {
    loadFromUrl: (url) => loadMapFromUrl(url).catch(e => err('loadFromUrl:', e.message)),
    load: (json) => load(json).catch(e => err('load:', e.message))
  };

  // ---- Wiring -------------------------------------------------------------
  // Map zeichnet, wenn der Renderer ruft:
  window.addEventListener('cb:render-frame', onRenderFrame);

  // Beim Spielstart Tileset vorwärmen und ggf. Default-Map laden
  window.addEventListener('cb:game-start', async () => {
    try {
      if (!tileset) await loadTileset();
      // Auto-Default: wenn noch keine Map gesetzt → map-mini.json
      if (!map) {
        await loadMapFromUrl('data/maps/map-mini.json');
      }
    } catch (e) {
      err('Start-Init:', e.message || e);
    }
  });
})();
