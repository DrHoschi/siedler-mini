/* ============================================================================
 * game.js – CityBuilder Engine Bootstrap
 * Version: v16.1.15
 * Ziel:
 *  - Engine sauber initialisieren
 *  - Karten & Tileset-Atlas laden (kein Layout-Touch)
 *  - Stabile Logs für den Inspector
 *  - Events: 'cb:game-started' etc.
 *  - Schlanke Hooks für das Bau-Menü
 * ========================================================================== */

(() => {
  'use strict';

  // --------------------------------------------------------------------------
  // Versions-/State-Info
  // --------------------------------------------------------------------------
  const VERSION = 'v16.1.15';
  const state = {
    engineReady: false,
    mapPath: null,
    lastStartTs: 0,
    canvas: null,
    ctx: null,
    // Für Debug/Inspector:
    atlasJsonUrl: 'assets/tiles/tileset.terrain.json',
    atlasImgUrl:  'assets/tiles/tileset.terrain.png',
    tileset: null,        // parsed JSON
    tilesetImg: null,     // HTMLImageElement
    map: null             // parsed map JSON
  };

  // Helfer zum loggen – alle Logs laufen zentral hier durch
  function log(level, msg, extra) {
    try {
      // 1) Konsole (kurz)
      const tag = `[game.js ${VERSION}]`;
      if (level === 'err') console.error(tag, msg, extra ?? '');
      else if (level === 'warn') console.warn(tag, msg, extra ?? '');
      else console.log(tag, msg, extra ?? '');

      // 2) Inspector (falls vorhanden)
      // Erwartete Signaturen:
      //   window.Inspector.log({ level:'ok'|'warn'|'err', source:'game', msg, data? })
      //   oder Fallback: window.logEvent?.(level, source, message)
      const payload = { level, source: 'game', msg, data: extra || null, ts: Date.now(), version: VERSION };
      window.Inspector?.log?.(payload);
      window.logEvent?.(level, 'game', msg, extra || null);
    } catch(_) {}
  }

  // --------------------------------------------------------------------------
  // DOM Ready
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    log('ok', `game.js geladen, game.js ${VERSION}`);
    // Canvas vorbereiten (wenn das Rendering im Engine-Kern stattfindet, ist das hier harmless)
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
  // Loader Utilities (Map/Atlas)
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
      // Cache umgehen, damit Atlas-Updates sicher ankommen
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.src = `${url}?v=${Date.now()}`;
    });
  }

  // --------------------------------------------------------------------------
  // Engine Bootstrap
  // --------------------------------------------------------------------------
  async function initEngineIfNeeded() {
    if (state.engineReady) return true;

    // Wenn es eine eigene Engine-Init gibt, rufen wir sie auf
    // Erwartete Signatur (locker): window.Engine?.init?.(options) → Promise|void
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

    // Falls es keinen Engine-Kern gibt, betreiben wir Minimal-Betrieb.
    // (Rendering übernimmt ggf. die Map-/Tileset-Demo unten.)
    state.engineReady = true;
    log('warn', 'Kein Engine-Kern gefunden – Fallback-Betrieb aktiv');
    return true;
  }

  // --------------------------------------------------------------------------
  // Map + Tileset laden und Engine/Renderer starten
  // --------------------------------------------------------------------------
  async function startGame(mapPath) {
    state.lastStartTs = Date.now();
    state.mapPath = mapPath;

    log('ok', `Map laden → ${mapPath}`);

    // 1) Engine init (falls nicht schon passiert)
    const ok = await initEngineIfNeeded();
    if (!ok) {
      log('err', 'Engine konnte nicht initialisiert werden');
      return;
    }

    // 2) Map/Atlas laden
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

    // 3) Engine informieren (wenn vorhanden)
    try {
      // Erwartete, lockere Signaturen:
      //   window.Engine?.loadTileset?.(json, image)
      //   window.Engine?.loadMap?.(mapJson)
      //   window.Engine?.start?.()
      window.Engine?.loadTileset?.(state.tileset, state.tilesetImg);
      window.Engine?.loadMap?.(state.map);

      if (typeof window.Engine?.start === 'function') {
        window.Engine.start();
        log('ok', `Game gestartet (${mapPath})`);
      } else {
        // Minimal-Renderer als Fallback, damit man "irgendwas" sieht.
        renderMinimalPreview();
        log('warn', 'Engine.start fehlt – Minimal-Preview gerendert');
      }

      // 4) Events/Callbacks für UI/Build-Menü
      window.dispatchEvent(new CustomEvent('cb:game-started', { detail: { mapPath, version: VERSION } }));
      window.GameUI?.onGameStarted?.(state.map, { version: VERSION });

      log('ok', 'Event: cb:game-started gesendet');

    } catch (err) {
      log('err', 'Start-Sequenz fehlgeschlagen', String(err));
    }
  }

  // --------------------------------------------------------------------------
  // Minimal-Preview (nur falls keine Engine vorhanden ist)
  // - Zeichnet einfache Checker/Rect, damit klar ist: die Map ist da.
  // - Verwendet KEIN Layout – nur Canvas.
  // --------------------------------------------------------------------------
  function renderMinimalPreview() {
    if (!state.canvas || !state.ctx || !state.map) return;

    const ctx = state.ctx;
    const { width = 16, height = 10, tileSize = 64 } = guessMapSize(state.map);

    // Fläche wischen
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

    // Prüfen, ob Tileset-Frames verfügbar sind
    const frames = extractFrames(state.tileset);
    const hasFrames = frames.length > 0 && state.tilesetImg;

    // Primitive Darstellung
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x * tileSize;
        const dy = y * tileSize;

        if (hasFrames) {
          // Frame wählen (pseudo, damit wenigstens was Kachel-haftes zu sehen ist)
          const f = frames[(x + y) % frames.length];
          ctx.drawImage(
            state.tilesetImg,
            f.x, f.y, f.w, f.h,
            dx, dy, tileSize, tileSize
          );
        } else {
          // Fallback-Farben
          ctx.fillStyle = ((x + y) % 2 === 0) ? '#7fbf7f' : '#9fd19f';
          ctx.fillRect(dx, dy, tileSize, tileSize);
        }

        // hauchfeines Grid
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(dx + 0.5, dy + 0.5, tileSize - 1, tileSize - 1);
      }
    }
    log('ok', `Minimal-Preview gezeichnet ${width}x${height} tiles (tile=${tileSize})`);
  }

  function guessMapSize(mapJson) {
    // Versucht width/height/tile zu raten – deine Map-Dateien haben die Felder meist gesetzt.
    // Falls nicht vorhanden, wählen wir konservative Defaults.
    const width = Number(mapJson?.width) || Number(mapJson?.cols) || 16;
    const height = Number(mapJson?.height) || Number(mapJson?.rows) || 10;
    const tileSize = Number(mapJson?.tile) || Number(mapJson?.tileSize) || 64;
    return { width, height, tileSize };
  }

  function extractFrames(tilesetJson) {
    // Erwartetes Format ähnlich TexturePacker: { frames: { key: { frame:{x,y,w,h}, ... }, ... } } ODER Array
    if (!tilesetJson) return [];
    const out = [];

    if (Array.isArray(tilesetJson.frames)) {
      for (const f of tilesetJson.frames) {
        const fr = f?.frame || f;
        if (fr && Number.isFinite(fr.x)) {
          out.push({ x: fr.x, y: fr.y, w: fr.w || fr.width || 64, h: fr.h || fr.height || 64 });
        }
      }
      return out;
    }

    if (tilesetJson.frames && typeof tilesetJson.frames === 'object') {
      for (const k of Object.keys(tilesetJson.frames)) {
        const fr = tilesetJson.frames[k]?.frame || tilesetJson.frames[k];
        if (fr && Number.isFinite(fr.x)) {
          out.push({ x: fr.x, y: fr.y, w: fr.w || fr.width || 64, h: fr.h || fr.height || 64 });
        }
      }
      return out;
    }

    // ganz rudimentär
    const tileW = Number(tilesetJson?.meta?.size?.w) || 1024;
    const tileH = Number(tilesetJson?.meta?.size?.h) || 1024;
    const step = 64;
    for (let y = 0; y < tileH; y += step) {
      for (let x = 0; x < tileW; x += step) {
        out.push({ x, y, w: step, h: step });
      }
    }
    return out;
  }

  // --------------------------------------------------------------------------
  // Öffentliche API (global)
  // --------------------------------------------------------------------------
  window.GameLoader = {
    /**
     * Startet das Spiel (Karte laden & Engine/Renderer anschieben)
     * @param {string} mapPath Pfad zur Map (z.B. "./assets/maps/map-mini.json")
     */
    start(mapPath) {
      if (!mapPath) {
        log('err', 'GameLoader.start ohne mapPath aufgerufen');
        return;
      }
      // Doppelklick/Spam-Blocker: keine Starts in derselben Animation-Frame-Schleife
      const delta = Date.now() - state.lastStartTs;
      if (delta < 200) {
        log('warn', 'Start abgebrochen – zu schnell hintereinander');
        return;
      }
      startGame(mapPath);
    },

    /**
     * Exponiere Version & Status
     */
    version: VERSION,
    get ready() { return !!state.engineReady; },
  };

  // --------------------------------------------------------------------------
  // Hooks für UI/Build-Menü – NICHT layout-relevant
  // --------------------------------------------------------------------------
  // Erwartung: ui-build.js hört auf 'cb:game-started' und blendet den Button ein.
  // Hier zusätzlich ein einfacher Platzier-Hook, falls du direkt aus der UI feuern willst:
  window.GameState = window.GameState || {};
  window.GameState.place = function place(toolId, gridX, gridY) {
    // 1) Event für Engine/Systems
    window.dispatchEvent(new CustomEvent('cb:place', {
      detail: { toolId, x: gridX, y: gridY }
    }));
    // 2) Log
    log('ok', `Place-Request: ${toolId} @ (${gridX},${gridY})`);
    // 3) Optional: Engine anstupsen
    try {
      window.Engine?.place?.({ toolId, x: gridX, y: gridY });
    } catch (err) {
      log('err', 'Engine.place Fehler', String(err));
    }
  };

  // --------------------------------------------------------------------------
  // Debug/Service-Utilities (für Start-Dialog/Inspector)
  // --------------------------------------------------------------------------
  window.GameServices = window.GameServices || {};

  /**
   * Von außen aufrufbar: Engine-Reset (zerstört nichts im Layout).
   * Nutzt der Start-Dialog z.B. für „Neu starten“.
   */
  window.GameServices.requestReset = async function requestReset() {
    log('ok', 'Neu-Start angefordert');
    try {
      await window.Engine?.reset?.();
    } catch (_e) {}
    state.engineReady = false;
    await initEngineIfNeeded();
  };

  /**
   * Von außen: Cache löschen (Storage + SW), ohne Layout zu ändern.
   */
  window.GameServices.clearCaches = async function clearCaches() {
    try {
      // Local/session Storage
      localStorage?.clear?.();
      sessionStorage?.clear?.();

      // Service Worker Cache
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      log('ok', 'Cache/Storage geleert – Seite ggf. neu laden');
    } catch (err) {
      log('err', 'Cache löschen fehlgeschlagen', String(err));
    }
  };

  // --------------------------------------------------------------------------
  // Safety: Alte Buttons/UI können prüfen, ob Engine bereit ist
  // --------------------------------------------------------------------------
  window.addEventListener('cb:ui-request-start', (ev) => {
    const mapPath = ev?.detail?.mapPath || './assets/maps/map-mini.json';
    if (!state.engineReady) {
      log('warn', 'Engine noch nicht bereit – warte auf GameLoader.start …');
      // Der Start-Dialog ruft danach bewusst GameLoader.start auf.
    }
    // Nichts weiter – die UI triggert ohnehin GameLoader.start()
  });

})();
