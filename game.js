/* =============================================================================
 * game.js – CityBuilder Engine Bootstrap
 * Version: v16.1.16
 * Ziel:
 *  - Engine stabil initialisieren
 *  - Karten & Tileset-Atlas laden (ohne Layout zu verändern)
 *  - Saubere Logs (für Inspector)
 *  - Events: 'cb:game-started', Platzier-Hooks
 *  - Rathaus (Holz) initial in Kartenmitte spawnen (Event/Hook + Log)
 * ===========================================================================*/

(() => {
  'use strict';

  // --------------------------------------------------------------------------
  // Versions-/State
  // --------------------------------------------------------------------------
  const VERSION = 'v16.1.16';
  const state = {
    engineReady: false,
    lastStartTs: 0,
    mapPath: null,
    canvas: null,
    ctx: null,

    // Assets (Tileset/Atlas: deine bestehenden Pfade)
    atlasJsonUrl: 'assets/tiles/tileset.terrain.json',
    atlasImgUrl : 'assets/tiles/tileset.terrain.png',

    tileset: null,      // parsed JSON
    tilesetImg: null,   // HTMLImageElement
    map: null           // parsed Map JSON
  };

  // --------------------------------------------------------------------------
  // Logging → Konsole + Inspector
  // --------------------------------------------------------------------------
  function log(level, msg, extra) {
    try {
      const tag = `[game.js ${VERSION}]`;
      if (level === 'err') console.error(tag, msg, extra ?? '');
      else if (level === 'warn') console.warn(tag, msg, extra ?? '');
      else console.log(tag, msg, extra ?? '');

      // Inspector: bevorzugte API
      const payload = { level, source: 'game', msg, data: extra || null, ts: Date.now(), version: VERSION };
      window.Inspector?.log?.(payload);
      // Fallback (falls alte Logger vorhanden sind)
      window.logEvent?.(level, 'game', msg, extra || null);
    } catch(_) {}
  }

  // --------------------------------------------------------------------------
  // DOM-Ready: Canvas sichern (stört Engine nicht, falls sie selbst rendert)
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    log('ok', `game.js geladen, game.js ${VERSION}`);
    state.canvas = document.getElementById('game-canvas') || document.querySelector('canvas');
    if (state.canvas) {
      state.ctx = state.canvas.getContext?.('2d') || null;
      const rect = state.canvas.getBoundingClientRect?.();
      log('ok', `Canvas bereit${rect ? ` ${Math.round(rect.width)}x${Math.round(rect.height)}` : ''}`);
    } else {
      log('warn', 'Kein <canvas> gefunden – Rendering übernimmt ggf. die Engine.');
    }
  });

  // --------------------------------------------------------------------------
  // Loader Utilities
  // --------------------------------------------------------------------------
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
      // Cache umgehen (Safari/GitHub)
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.src = `${url}?v=${Date.now()}`;
    });
  }

  // --------------------------------------------------------------------------
  // Engine-Bootstrap (wenn vorhanden), sonst Fallback
  // --------------------------------------------------------------------------
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
      log('err', 'Engine.init hat einen Fehler geworfen', String(err));
      return false;
    }
    // Kein Engine-Kern → Fallback-Betrieb, damit Start/Logs funktionieren
    state.engineReady = true;
    log('warn', 'Kein Engine-Kern gefunden – Fallback-Betrieb aktiv');
    return true;
  }

  // --------------------------------------------------------------------------
  // Map + Tileset laden und (falls vorhanden) Engine starten
  // --------------------------------------------------------------------------
  async function startGame(mapPath) {
    state.lastStartTs = Date.now();
    state.mapPath = mapPath;
    log('ok', `Map laden → ${mapPath}`);

    // 1) Engine init
    const ok = await initEngineIfNeeded();
    if (!ok) { log('err', 'Engine konnte nicht initialisiert werden'); return; }

    // 2) Map & Atlas
    try {
      const [map, tileset, tilesetImg] = await Promise.all([
        fetchJson(mapPath),
        fetchJson(state.atlasJsonUrl),
        loadImage(state.atlasImgUrl)
      ]);
      state.map = map;
      state.tileset = tileset;
      state.tilesetImg = tilesetImg;
    } catch (err) {
      log('err', 'Map/Atlas laden fehlgeschlagen', String(err));
      return;
    }

    // 3) Engine informieren / starten
    try {
      window.Engine?.loadTileset?.(state.tileset, state.tilesetImg);
      window.Engine?.loadMap?.(state.map);

      if (typeof window.Engine?.start === 'function') {
        window.Engine.start();
        log('ok', `Game gestartet (${mapPath})`);
      } else {
        renderMinimalPreview();     // etwas Sichtbares ohne Engine
        log('warn', 'Engine.start fehlt – Minimal-Preview gerendert');
      }

      // 4) Events/Callbacks (UI/Bau-Menü & Außenwelt)
      window.dispatchEvent(new CustomEvent('cb:game-started', { detail: { mapPath, version: VERSION } }));
      window.GameUI?.onGameStarted?.(state.map, { version: VERSION });
      log('ok', 'Event: cb:game-started gesendet');

      // 5) Rathaus initial spawnen (Event/Hook + Log; Rendering macht Engine)
      spawnTownHall();

    } catch (err) {
      log('err', 'Start-Sequenz fehlgeschlagen', String(err));
    }
  }

  // --------------------------------------------------------------------------
  // Minimal-Preview (nur falls keine Engine rendert)
  // --------------------------------------------------------------------------
  function renderMinimalPreview() {
    if (!state.canvas || !state.ctx || !state.map) return;
    const ctx = state.ctx;
    const { width = 16, height = 10, tileSize = 64 } = guessMapSize(state.map);

    // Grid zeichnen (Pseudo-Tiles über Atlas-Sampling)
    const frames = extractFrames(state.tileset);
    const hasFrames = frames.length > 0 && state.tilesetImg;

    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x * tileSize, dy = y * tileSize;
        if (hasFrames) {
          const f = frames[(x + y) % frames.length];
          ctx.drawImage(state.tilesetImg, f.x, f.y, f.w, f.h, dx, dy, tileSize, tileSize);
        } else {
          ctx.fillStyle = ((x + y) % 2 === 0) ? '#7fbf7f' : '#9fd19f';
          ctx.fillRect(dx, dy, tileSize, tileSize);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(dx + 0.5, dy + 0.5, tileSize - 1, tileSize - 1);
      }
    }
    log('ok', `Minimal-Preview gezeichnet ${width}x${height} (tile=${tileSize})`);
  }

  function guessMapSize(mapJson) {
    const width = Number(mapJson?.width) || Number(mapJson?.cols) || 16;
    const height = Number(mapJson?.height) || Number(mapJson?.rows) || 10;
    const tileSize = Number(mapJson?.tile) || Number(mapJson?.tileSize) || 64;
    return { width, height, tileSize };
  }

  // Frames aus Atlas (robust gegen verschiedene Formate)
  function extractFrames(tilesetJson) {
    if (!tilesetJson) return [];
    const out = [];

    if (Array.isArray(tilesetJson.frames)) {
      for (const f of tilesetJson.frames) {
        const fr = f?.frame || f;
        if (fr && Number.isFinite(fr.x)) out.push({ x: fr.x, y: fr.y, w: fr.w || fr.width || 64, h: fr.h || fr.height || 64 });
      }
      return out;
    }
    if (tilesetJson.frames && typeof tilesetJson.frames === 'object') {
      for (const k of Object.keys(tilesetJson.frames)) {
        const fr = tilesetJson.frames[k]?.frame || tilesetJson.frames[k];
        if (fr && Number.isFinite(fr.x)) out.push({ x: fr.x, y: fr.y, w: fr.w || fr.width || 64, h: fr.h || fr.height || 64 });
      }
      return out;
    }
    // Notlösung: 64er Raster über meta.size iterieren
    const tileW = Number(tilesetJson?.meta?.size?.w) || 1024;
    const tileH = Number(tilesetJson?.meta?.size?.h) || 1024;
    const step = 64;
    for (let y = 0; y < tileH; y += step) for (let x = 0; x < tileW; x += step) out.push({ x, y, w: step, h: step });
    return out;
  }

  // --------------------------------------------------------------------------
  // Öffentliche API (global)
  // --------------------------------------------------------------------------
  window.GameLoader = {
    /**
     * Startet das Spiel (Karte laden & Engine/Renderer anschieben)
     * @param {string} mapPath z.B. "./assets/maps/map-mini.json"
     */
    start(mapPath) {
      if (!mapPath) { log('err', 'GameLoader.start ohne mapPath aufgerufen'); return; }
      const delta = Date.now() - state.lastStartTs;
      if (delta < 200) { log('warn', 'Start abgebrochen – zu schnell hintereinander'); return; }
      startGame(mapPath);
    },
    version: VERSION,
    get ready(){ return !!state.engineReady; },
  };

  // Hook für Baumenü / externe UI
  window.GameState = window.GameState || {};
  window.GameState.place = function place(toolId, gridX, gridY) {
    window.dispatchEvent(new CustomEvent('cb:place', { detail: { toolId, x: gridX, y: gridY } }));
    log('ok', `Place-Request: ${toolId} @ (${gridX},${gridY})`);
    try { window.Engine?.place?.({ toolId, x: gridX, y: gridY }); } catch (err) { log('err', 'Engine.place Fehler', String(err)); }
  };

  // Service-Utilities, die dein Startfenster nutzt
  window.GameServices = window.GameServices || {};
  window.GameServices.requestReset = async function requestReset() {
    log('ok', 'Neu-Start angefordert');
    try { await window.Engine?.reset?.(); } catch(_){}
    state.engineReady = false;
    await initEngineIfNeeded();
  };
  window.GameServices.clearCaches = async function clearCaches() {
    try {
      localStorage?.clear?.(); sessionStorage?.clear?.();
      if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
      log('ok', 'Cache/Storage geleert – Seite ggf. neu laden');
    } catch (err) { log('err', 'Cache löschen fehlgeschlagen', String(err)); }
  };

  // Start-Event von der UI (Start-Panel)
  window.addEventListener('cb:ui-request-start', (ev) => {
    const mapPath = ev?.detail?.mapPath || './assets/maps/map-mini.json';
    if (!state.engineReady) {
      log('warn', 'Engine noch nicht bereit – warte auf GameLoader.start …');
    }
    // Die UI ruft zusätzlich GameLoader.start(); falls nicht, sind wir tolerant:
    if (window.GameLoader?.start) window.GameLoader.start(mapPath);
  });

  // --------------------------------------------------------------------------
  // Rathaus-Spawn (Event/Hook – Engine rendert / Minimalpreview zeigt nur Grid)
  // --------------------------------------------------------------------------
  function spawnTownHall() {
    const { width, height } = guessMapSize(state.map || {});
    const center = { x: Math.floor(width/2), y: Math.floor(height/2) };

    // Primär: Engine-Hook (falls vorhanden)
    try {
      window.Engine?.spawn?.({
        kind: 'townhall',
        tier: 'wood',
        icon: 'assets/tex/building/Holz_Rathaus_1.png',
        position: center
      });
    } catch(_) {}

    // Event für Systeme/UI
    window.dispatchEvent(new CustomEvent('cb:spawn', {
      detail: {
        entity: 'townhall',
        tier: 'wood',
        icon: 'assets/tex/building/Holz_Rathaus_1.png',
        x: center.x, y: center.y
      }
    }));

    log('ok', `Rathaus (Holz) gespawnt @ (${center.x},${center.y})`);

    // Hinweis fürs Upgrade (Stein) – nur Markierung/Ereignis
    // Upgrade-Icon: assets/tex/building/Stein_Rathaus_1.png
    // Sobald deine Logik die Bedingungen erfüllt, kannst du ein Badge/Hint setzen:
    // window.dispatchEvent(new CustomEvent('cb:upgrade-available', {
    //   detail: { entity:'townhall', nextTier:'stone', icon:'assets/tex/building/Stein_Rathaus_1.png' }
    // }));
  }

})();
