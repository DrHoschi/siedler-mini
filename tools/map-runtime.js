/* ============================================================================
   tools/map-runtime.js
   ----------------------------------------------------------------------------
   Zweck
   -----
   Lädt eine Karten-JSON (z. B. assets/maps/map-pro.json), optional einen
   Tile-Atlas (tileset.json + tileset.png), und rendert sie auf ein Canvas.
   - Unterstützt Query-Param `?map=…` (z. B. index.html?map=assets/maps/map-demo.json)
   - Robustes Logging (einheitliche, gut durchsuchbare Tags)
   - Funktioniert als ES‑Module UND als globales Objekt (window.MapRuntime)

   Öffentliche API
   ---------------
   - loadMapFromRuntime(canvas, mapUrl[, options])
   - resolveMapUrlFromQuery([fallbackUrl])
   - version

   Optionen (optional)
   -------------------
   {
     tilesetBase: 'assets/tiles/',       // Basispfad, falls im Map-JSON nichts steht
     bust: true,                         // Cache-Buster aktivieren (default: true)
     imageSmoothing: false,              // ob Browser-Smoothing aktiv sein soll
     debugLog: true,                     // Logs an/aus
   }

   Tileset-JSON (Erwartung)
   ------------------------
   {
     "image": "tileset.png",
     "tileSize": 64,
     "imageWidth": 1024,
     "imageHeight": 1024,
     "frames": {
       "grass": { "x":0, "y":0, "w":64, "h":64 },
       "dirt":  { "x":64, "y":0, "w":64, "h":64 }
       ...
     }
   }

   Map-JSON (Erwartung – tolerant)
   -------------------------------
   {
     "width":  50,     // in Tiles
     "height": 40,     // in Tiles
     "tileSize": 64,   // optional; sonst aus Tileset
     "atlas": {
        "json":  "../tiles/tileset.json",
        "image": "../tiles/tileset.png"  // optional; sonst aus Tileset-JSON
     },
     "layers": [
        {
          "name": "ground",
          // grid als 2D-Array (height x width) mit Frame-Keys aus tileset.json
          "grid": [
            ["grass","grass","dirt", ...],
            ...
          ]
        }
     ]
   }

   Fallback
   --------
   Wenn kein Atlas gefunden/ladbar ist oder Frames fehlen, rendert der Loader
   ein „magenta/anthrazit“-Platzhalter oder ein Schachbrett-Grid, damit man
   sofort erkennt, dass etwas fehlt – aber die App läuft weiter.

   © Siedler‑Mini (Projekt-intern). Diese Datei darf kommentiert bleiben.
============================================================================ */

/* ────────────────────────────────────────────────────────────────────────────
   Hilfs‑Logging
   ──────────────────────────────────────────────────────────────────────────── */
const LOG = {
  on: true, // wird unten aus options.debugLog überschrieben
  tag(t) { return `[${t}]`; },
  info(t, ...a) { if (this.on) console.log(this.tag(t), ...a); },
  warn(t, ...a) { if (this.on) console.warn(this.tag(t), ...a); },
  error(t, ...a){ if (this.on) console.error(this.tag(t), ...a); },
};

/* ────────────────────────────────────────────────────────────────────────────
   URL‑Utils
   ──────────────────────────────────────────────────────────────────────────── */

/** Führt zwei Pfadsegmente robust zusammen (ohne doppelte Slashes). */
function joinUrl(base, rel) {
  if (!base) return rel || '';
  if (!rel)  return base;
  // Browser-URL-API zur robusten Auflösung relativer Pfade:
  try {
    return new URL(rel, new URL(base, window.location.href)).toString();
  } catch {
    // einfache Fallback-Variante
    if (base.endsWith('/')) base = base.slice(0, -1);
    if (rel.startsWith('/')) rel = rel.slice(1);
    return `${base}/${rel}`;
  }
}

/** Liefert Verzeichnis-Anteil einer URL (ohne Dateiname). */
function dirname(url) {
  try {
    const u = new URL(url, window.location.href);
    u.pathname = u.pathname.replace(/\/[^/]*$/, '/');
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return url.replace(/\/[^/]*$/, '/');
  }
}

/** Hängt (falls gewünscht) einen Cache‑Buster an. */
function withBust(url, enableBust) {
  if (!enableBust) return url;
  try {
    const u = new URL(url, window.location.href);
    // Bereits vorhandene „v“/„bust“ überschreiben wir nicht
    if (!u.searchParams.has('v') && !u.searchParams.has('bust')) {
      u.searchParams.set('bust', String(Date.now()));
    }
    return u.toString();
  } catch {
    // Fallback: einfacher Anhang
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}bust=${Date.now()}`;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   Fetch‑Utils
   ──────────────────────────────────────────────────────────────────────────── */

/** JSON laden mit Fehlerbehandlung. */
async function fetchJSON(url) {
  const t0 = performance.now();
  const res = await fetch(url, { cache: 'no-store' });
  const dt = Math.round(performance.now() - t0);
  if (!res.ok) {
    LOG.warn('net', `${res.status} ${url} (${dt}ms)`);
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  LOG.info('net', `200 ${url} (${dt}ms)`);
  return res.json();
}

/** Image laden (Promise) mit Fehlerbehandlung. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Wichtig für GitHub Pages iOS/Safari: Same-Origin des Projekts
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error(`Image load failed: ${url}`));
    img.src = url;
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   Darstellung „crisp“ (kein Weichzeichnen) – reine Canvas‑Seiteneffekte
   ──────────────────────────────────────────────────────────────────────────── */
function setCanvasCrisp(canvas, smoothing = false) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = !!smoothing;
    ctx.imageSmoothingQuality = 'low';
  }
  // CSS‑Seite: je nach Browser
  const style = canvas.style;
  style.imageRendering = smoothing ? 'auto' : 'pixelated'; // moderne Browser
  style.msInterpolationMode = smoothing ? 'bicubic' : 'nearest-neighbor'; // Alt‑IE
}

/* ────────────────────────────────────────────────────────────────────────────
   Query‑Param‑Unterstützung
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Liest ?map=… aus der aktuellen URL. Wenn vorhanden, wird die URL (bereits
 * absolut aufgelöst) zurückgegeben. Ansonsten `fallbackUrl`.
 */
function resolveMapUrlFromQuery(fallbackUrl = null) {
  try {
    const u = new URL(window.location.href);
    const map = u.searchParams.get('map');
    if (map) {
      const resolved = new URL(map, u).toString();
      LOG.info('diag', `Query map=… erkannt → ${resolved}`);
      return resolved;
    }
  } catch {
    // ignorieren
  }
  return fallbackUrl;
}

/* ────────────────────────────────────────────────────────────────────────────
   Kern: Tileset & Map laden und rendern
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Lädt Map + Tileset und rendert auf das Canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {string} mapUrl - absolute oder relative URL zur Map-JSON
 * @param {object} options - siehe Kopf-Kommentar
 */
async function loadMapFromRuntime(canvas, mapUrl, options = {}) {
  const {
    tilesetBase = 'assets/tiles/',
    bust = true,
    imageSmoothing = false,
    debugLog = true,
  } = options;

  LOG.on = !!debugLog;

  if (!canvas) throw new Error('loadMapFromRuntime(): canvas fehlt');
  if (!mapUrl) throw new Error('loadMapFromRuntime(): mapUrl fehlt');

  // Canvas „crisp“ vorbereiten
  setCanvasCrisp(canvas, imageSmoothing);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D‑Context nicht verfügbar');

  // Map‑URL vorbereiten (+ optional bust)
  const mapUrlBusted = withBust(mapUrl, bust);

  // 1) MAP laden
  LOG.info('game', 'Lade Karte:', mapUrlBusted);
  const map = await fetchJSON(mapUrlBusted);

  // Basis für relative Pfade aus der Map
  const base = dirname(mapUrlBusted);
  LOG.info('atlas', `base=${base}`);

  // 2) Tileset ermitteln
  //    Quelle A: map.atlas.json / map.atlas.image
  //    Quelle B: fallback (options.tilesetBase)
  let tilesetJsonUrl = null;
  let tilesetPngUrl  = null;

  if (map.atlas && typeof map.atlas === 'object') {
    if (map.atlas.json) {
      tilesetJsonUrl = joinUrl(base, map.atlas.json);
      LOG.info('atlas', `json=${map.atlas.json} → ${tilesetJsonUrl}`);
    }
    if (map.atlas.image) {
      tilesetPngUrl = joinUrl(base, map.atlas.image);
      LOG.info('atlas', `image=${map.atlas.image} → ${tilesetPngUrl}`);
    }
  }

  // Falls kein atlas.json angegeben, nutze Standard‑Ort:
  if (!tilesetJsonUrl) {
    tilesetJsonUrl = joinUrl(base, joinUrl(tilesetBase, 'tileset.json'));
    LOG.info('atlas', `json (fallback) → ${tilesetJsonUrl}`);
  }

  // Tileset‑JSON laden
  let tileset = null;
  try {
    tileset = await fetchJSON(withBust(tilesetJsonUrl, bust));
  } catch (err) {
    LOG.warn('game', `Atlas JSON konnte nicht geladen werden – fahre ohne Atlas fort.\n@${tilesetJsonUrl}`);
  }

  // 3) Tileset‑PNG URL bestimmen
  if (!tilesetPngUrl && tileset && tileset.image) {
    tilesetPngUrl = joinUrl(dirname(tilesetJsonUrl), tileset.image);
    LOG.info('atlas', `image (aus tileset.json) → ${tilesetPngUrl}`);
  }
  if (!tilesetPngUrl) {
    // Letzter Fallback: Standard-Dateiname
    tilesetPngUrl = joinUrl(base, joinUrl(tilesetBase, 'tileset.png'));
    LOG.info('atlas', `image (fallback) → ${tilesetPngUrl}`);
  }

  // 4) Tileset‑PNG laden (nur wenn wir Frames haben – sonst egal)
  let tilesetImg = null;
  if (tileset && tileset.frames && typeof tileset.frames === 'object') {
    try {
      tilesetImg = await loadImage(withBust(tilesetPngUrl, bust));
      LOG.info('net', `200 ${tilesetPngUrl}`);
    } catch (err) {
      LOG.warn('game', `Tileset PNG konnte nicht geladen werden – fahre ohne Atlas fort.\n@${tilesetPngUrl}`);
      tilesetImg = null;
      tileset = null;
    }
  } else {
    LOG.warn('game', 'Atlas‑JSON unvollständig/ungültig – überspringe Atlas.');
    tileset = null;
  }

  // 5) Render‑Parameter bestimmen
  const tileSize = Number(map.tileSize || tileset?.tileSize || 64);
  const mapW = Number(map.width  || (Array.isArray(map.layers?.[0]?.grid?.[0]) ? map.layers[0].grid[0].length : 0));
  const mapH = Number(map.height || (Array.isArray(map.layers?.[0]?.grid) ? map.layers[0].grid.length : 0));

  // Canvasgröße an Map anpassen (DevicePixelRatio berücksichtigen)
  const DPR = window.devicePixelRatio || 1;
  canvas.width  = Math.max(1, Math.floor(mapW * tileSize * DPR));
  canvas.height = Math.max(1, Math.floor(mapH * tileSize * DPR));
  canvas.style.width  = `${Math.max(1, mapW * tileSize)}px`;
  canvas.style.height = `${Math.max(1, mapH * tileSize)}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // logisches Pixelmaß

  // 6) Rendern
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const layers = Array.isArray(map.layers) ? map.layers : [];

  if (tileset && tilesetImg) {
    // Normalfall: mit Frames rendern
    for (const layer of layers) {
      if (!Array.isArray(layer.grid)) continue;
      for (let y = 0; y < layer.grid.length; y++) {
        const row = layer.grid[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < row.length; x++) {
          const key = row[x];
          const f = tileset.frames?.[key];
          const dx = x * tileSize;
          const dy = y * tileSize;

          if (f) {
            ctx.drawImage(
              tilesetImg,
              f.x, f.y, f.w, f.h,
              dx,  dy,   tileSize, tileSize
            );
          } else if (key != null) {
            // Platzhalter (magenta) für unbekannte Keys
            ctx.fillStyle = '#C2185B';
            ctx.fillRect(dx, dy, tileSize, tileSize);
            ctx.strokeStyle = '#212121';
            ctx.strokeRect(dx + 0.5, dy + 0.5, tileSize - 1, tileSize - 1);
          }
        }
      }
    }
  } else {
    // Fallback: Schachbrett‑Grid, damit das Spiel sichtbar weiterläuft.
    LOG.warn('game', 'Kein Atlas geladen — rendere Grid‑Fallback.');
    const colA = '#22303a';
    const colB = '#31414e';
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        ctx.fillStyle = ((x + y) & 1) ? colA : colB;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  LOG.info('game', 'Karte geladen:', mapUrlBusted);
}

/* ────────────────────────────────────────────────────────────────────────────
   Öffentliche API (Dual‑Export)
   ──────────────────────────────────────────────────────────────────────────── */

// Version dieser Laufzeit
const version = '1.1.0';

// Globaler Namespace – für Code, der window.MapRuntime erwartet:
try {
  window.MapRuntime = window.MapRuntime || {};
  window.MapRuntime.load = loadMapFromRuntime;
  window.MapRuntime.resolveMapUrlFromQuery = resolveMapUrlFromQuery;
  window.MapRuntime.version = version;
} catch { /* SSR / non‑browser safe‑guard */ }

// ESM‑Exports:
export { loadMapFromRuntime, resolveMapUrlFromQuery, version };
export default { loadMapFromRuntime, resolveMapUrlFromQuery, version };
