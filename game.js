/* ============================================================================
 * game.js – CityBuilder Engine Bootstrap
 * Version: v16.1.16
 * Ziele:
 *  - Engine sauber initialisieren (ohne Layout zu verändern)
 *  - Karten & Tileset-Atlas laden
 *  - Stabile Logs für den Inspector
 *  - Events: 'cb:game-started', GameUI.onGameStarted()
 *  - Schlanke Hooks für Bau-Menü und Start-Dialog
 * ========================================================================== */
(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // Version/State
  // -------------------------------------------------------------------------
  const VERSION = 'v16.1.16';
  const state = {
    engineReady: false,
    lastStartTs: 0,
    mapPath: null,

    canvas: null,
    ctx: null,

    // Pfade zum Terrain-Atlas
    atlasJsonUrl: 'assets/tiles/tileset.terrain.json',
    atlasImgUrl:  'assets/tiles/tileset.terrain.png',

    tileset: null,      // JSON aus atlasJsonUrl
    tilesetImg: null,   // Image aus atlasImgUrl
    map: null           // geladene Map (JSON)
  };

  // -------------------------------------------------------------------------
  // Zentrales Logging (Konsole + Inspector)
  // -------------------------------------------------------------------------
  function log(level, msg, extra) {
    const tag = `[game.js ${VERSION}]`;
    try {
      if (level === 'err') console.error(tag, msg, extra ?? '');
      else if (level === 'warn') console.warn(tag, msg, extra ?? '');
      else console.log(tag, msg, extra ?? '');
      // an Inspector weiterreichen (wenn vorhanden)
      window.Inspector?.log?.({
        level, source: 'game', msg, data: extra || null, ts: Date.now(), version: VERSION
      });
    } catch (_) {}
  }

  // -------------------------------------------------------------------------
  // DOM ready → Canvas referenzieren
  // -------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    log('ok', `game.js geladen, game.js ${VERSION}`);
    state.canvas = document.getElementById('game') || document.querySelector('canvas');
    if (state.canvas) {
      state.ctx = state.canvas.getContext?.('2d') || null;
      const rect = state.canvas.getBoundingClientRect?.();
      log('ok', `Canvas bereit${rect ? ` ${Math.round(rect.width)}x${Math.round(rect.height)}` : ''}`);
    } else {
      log('warn', 'Kein <canvas id="game"> gefunden – Fallback kann nichts zeichnen.');
    }
  });

  // -------------------------------------------------------------------------
  // Loader (Map/Atlas)
  // -------------------------------------------------------------------------
  async function fetchJson(url) {
    const t0 = performance.now();
    log('ok', `Lade JSON → ${url}`);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
    const json = await res.json();
    log('ok', `JSON OK (${Math.round(performance.now() - t0)}ms) ← ${url}`);
    return json;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      log('ok', `Lade Bild → ${url}`);
      const img = new Image();
      img.onload = () => { log('ok', `Bild OK ${img.width}x${img.height} ← ${url}`); resolve(img); };
      img.onerror = () => { log('err', `Bild fehlgeschlagen ← ${url}`); reject(new Error('image load failed')); };
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.src = `${url}?v=${Date.now()}`; // Cache-Buster
    });
  }

  // -------------------------------------------------------------------------
  // Engine-Init (falls du später einen Kern einhängst)
  // -------------------------------------------------------------------------
  async function initEngineIfNeeded() {
    if (state.engineReady) return true;
    try {
      if (window.Engine?.init) {
        log('ok', 'Engine.init aufrufen …');
        await window.Engine.init({ version: VERSION });
        state.engineReady = true;
        log('ok', 'Engine init → bereit');
        return true;
      }
    } catch (err) {
      log('err', 'Engine.init Fehler', String(err));
      return false;
    }
    // Kein Kern → Fallback-Modus
    state.engineReady = true;
    log('warn', 'Kein Engine-Kern gefunden – Fallback-Betrieb aktiv');
    return true;
  }

  // -------------------------------------------------------------------------
  // Start-Sequenz (Map + Atlas + Render/Fallback)
  // -------------------------------------------------------------------------
  async function startGame(mapPath) {
    state.lastStartTs = Date.now();
    state.mapPath = mapPath;
    log('ok', `Map laden → ${mapPath}`);

    const ok = await initEngineIfNeeded();
    if (!ok) { log('err', 'Engine konnte nicht initialisiert werden'); return; }

    try {
      const [map, tileset, tilesetImg] = await Promise.all([
        fetchJson(mapPath),
        fetchJson(state.atlasJsonUrl),
        loadImage(state.atlasImgUrl)
      ]);
      state.map = map; state.tileset = tileset; state.tilesetImg = tilesetImg;
    } catch (err) {
      log('err', 'Map/Atlas laden fehlgeschlagen', String(err));
      return;
    }

    // Engine/Renderer informieren (wenn vorhanden)
    try {
      window.Engine?.loadTileset?.(state.tileset, state.tilesetImg);
      window.Engine?.loadMap?.(state.map);

      if (typeof window.Engine?.start === 'function') {
        window.Engine.start();
        log('ok', `Game gestartet (${mapPath})`);
      } else {
        // Fallback: einfache Kachel-Vorschau
        renderMinimalPreview();
        log('warn', 'Engine.start fehlt – Minimal-Preview gerendert');
      }

      // Events an UI/Inspector
      window.dispatchEvent(new CustomEvent('cb:game-started', { detail: { mapPath, version: VERSION } }));
      window.GameUI?.onGameStarted?.(state.map, { version: VERSION });
      log('ok', 'Event: cb:game-started gesendet');
    } catch (err) {
      log('err', 'Start-Sequenz fehlgeschlagen', String(err));
    }
  }

  // -------------------------------------------------------------------------
  // Minimaler Preview-Renderer (zeigt Terrain-Atlas gekachelt)
  // -------------------------------------------------------------------------
  function renderMinimalPreview() {
    if (!state.canvas || !state.ctx || !state.map) return;
    const ctx = state.ctx;
    const { width = 16, height = 10, tileSize = 64 } = guessMapSize(state.map);

    // Canvas auf Weltgröße anpassen
    state.canvas.width  = width * tileSize;
    state.canvas.height = height * tileSize;

    // Frames aus dem Atlas extrahieren (grobe Heuristik)
    const frames = extractFrames(state.tileset);
    const hasFrames = frames.length > 0 && state.tilesetImg;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x * tileSize, dy = y * tileSize;
        if (hasFrames) {
          // pseudo-sequenziell, damit die Fläche „texturiert“ aussieht
          const f = frames[(x + y) % frames.length];
          ctx.drawImage(state.tilesetImg, f.x, f.y, f.w, f.h, dx, dy, tileSize, tileSize);
        } else {
          // Fallback-Farbe
          ctx.fillStyle = ((x + y) % 2 === 0) ? '#7fbf7f' : '#9fd19f';
          ctx.fillRect(dx, dy, tileSize, tileSize);
        }
        // feines Grid
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(dx + .5, dy + .5, tileSize - 1, tileSize - 1);
      }
    }

    // Rathaus (Holz) initial mittig platzieren (nur visuell im Fallback)
    tryPlaceRathausPreview(width, height, tileSize);

    log('ok', `Minimal-Preview gezeichnet ${width}x${height} (tile=${tileSize})`);
  }

  function guessMapSize(mapJson) {
    const width    = Number(mapJson?.width)  || Number(mapJson?.cols)     || 16;
    const height   = Number(mapJson?.height) || Number(mapJson?.rows)     || 10;
    const tileSize = Number(mapJson?.tile)   || Number(mapJson?.tileSize) || 64;
    return { width, height, tileSize };
  }

  function extractFrames(tilesetJson) {
    if (!tilesetJson) return [];
    const out = [];

    // TexturePacker-ähnlich (frames: {key:{frame:{x,y,w,h}}})
    if (tilesetJson.frames && typeof tilesetJson.frames === 'object') {
      for (const k of Object.keys(tilesetJson.frames)) {
        const fr = tilesetJson.frames[k]?.frame || tilesetJson.frames[k];
        if (fr && Number.isFinite(fr.x)) out.push({ x: fr.x, y: fr.y, w: fr.w || fr.width || 64, h: fr.h || fr.height || 64 });
      }
      return out;
    }

    // frames als Array
    if (Array.isArray(tilesetJson.frames)) {
      for (const f of tilesetJson.frames) {
        const fr = f?.frame || f;
        if (fr && Number.isFinite(fr.x)) out.push({ x: fr.x, y: fr.y, w: fr.w || fr.width || 64, h: fr.h || fr.height || 64 });
      }
      return out;
    }

    // Notlösung: 64er Raster über die Atlas-Gesamtgröße legen
    const tileW = Number(tilesetJson?.meta?.size?.w) || 1024;
    const tileH = Number(tilesetJson?.meta?.size?.h) || 1024;
    const step = 64;
    for (let y = 0; y < tileH; y += step) {
      for (let x = 0; x < tileW; x += step) out.push({ x, y, w: step, h: step });
    }
    return out;
  }

  // Kleiner Preview-Helfer: Rathäuser
  async function tryPlaceRathausPreview(w, h, tile) {
    const ctx = state.ctx;
    if (!ctx) return;

    // Primär Holz-Rathaus, optional später Stein-Upgrade
    const imgUrlHolz  = 'assets/tex/building/Holz_Rathaus_1.png';
    const imgUrlStein = 'assets/tex/building/Stein_Rathaus_1.png'; // wird später fürs Upgrade verwendet

    try {
      const img = await loadImage(imgUrlHolz);
      const px = Math.floor((w * tile - img.width)  / 2);
      const py = Math.floor((h * tile - img.height) / 2);
      ctx.drawImage(img, px, py);
      log('ok', 'Rathaus (Holz) im Preview zentriert platziert');
    } catch {
      // ignorieren, wenn Datei (noch) fehlt
    }
  }

  // -------------------------------------------------------------------------
  // Öffentliche API
  // -------------------------------------------------------------------------
  window.GameLoader = {
    /** Startet das Spiel mit der angegebenen Karte */
    start(mapPath) {
      if (!mapPath) { log('err', 'GameLoader.start ohne mapPath'); return; }
      const delta = Date.now() - state.lastStartTs;
      if (delta < 150) { log('warn', 'Start abgebrochen – zu schneller Mehrfachklick'); return; }
      startGame(mapPath);
    },
    version: VERSION,
    get ready(){ return !!state.engineReady; }
  };

  // Start-Dialog-Hilfen
  window.GameServices = window.GameServices || {};
  window.GameServices.requestReset = async function() {
    log('ok', 'Neu-Start angefordert');
    try { await window.Engine?.reset?.(); } catch(_) {}
    state.engineReady = false;
    await initEngineIfNeeded();
  };
  window.GameServices.clearCaches = async function() {
    try {
      localStorage?.clear?.(); sessionStorage?.clear?.();
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      log('ok', 'Cache/Storage geleert – Seite ggf. neu laden');
    } catch (err) {
      log('err', 'Cache löschen fehlgeschlagen', String(err));
    }
  };

  // UI-Hook fürs Setzen aus dem Bau-Menü (wenn du willst)
  window.GameState = window.GameState || {};
  window.GameState.place = function(toolId, gridX, gridY){
    window.dispatchEvent(new CustomEvent('cb:place', { detail:{ toolId, x:gridX, y:gridY }}));
    log('ok', `Place-Request: ${toolId} @ (${gridX},${gridY})`);
    try { window.Engine?.place?.({ toolId, x:gridX, y:gridY }); } catch(_) {}
  };

  // Safety: falls alte UI auf „Engine bereit?“ hört
  window.addEventListener('cb:ui-request-start', (ev)=>{
    const mapPath = ev?.detail?.mapPath || './assets/maps/map-mini.json';
    if (!state.engineReady) {
      log('warn', 'Engine noch nicht bereit – warte auf GameLoader.start …');
    }
    // Die UI ruft danach ohnehin GameLoader.start(mapPath) auf.
  });

})();
