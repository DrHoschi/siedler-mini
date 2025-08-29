/* ============================================================================
 * game.js – Siedler Mini (Engine/Loader)
 * Version: v16.1.15
 * ---------------------------------------------------------------------------
 * Aufgaben:
 *  - Stellt window.GameLoader.start(mapPath) bereit
 *  - Initialisiert die Engine und signalisiert Bereitschaft
 *  - Lädt/validiert eine Map (width/height) + optionalen Tileset/Atlas
 *  - Sendet Custom Events: 'cb:engine-ready', 'cb:map-loaded', 'cb:game-started'
 *  - Loggt in Inspector (falls vorhanden) + console
 *  - Keine Layout-Änderungen!
 * ========================================================================== */

(() => {
  const VERSION = 'v16.1.15';

  // ------------------------------ Utilities ---------------------------------
  const now = () => new Date().toISOString().slice(11, 19); // HH:MM:SS
  const tag = (lvl) => ({
    ok:  '✅ (ok)',
    warn:'⚠️ (warn)',
    err: '❌ (err)',
    info:'ℹ️ (info)'
  }[lvl] || 'ℹ️');

  function log(lvl, msg) {
    const line = `[${now()}] ${tag(lvl)} ${msg}`;
    // Inspector-Bridge (nicht zwingend vorhanden)
    try {
      window.Inspector?.log?.(lvl, msg);
    } catch {}
    // Immer auch Konsole:
    if (lvl === 'err') console.error(line);
    else if (lvl === 'warn') console.warn(line);
    else console.log(line);
  }

  function dispatch(name, detail = {}) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (e) {
      log('warn', `Event ${name} konnte nicht dispatcht werden: ${e?.message || e}`);
    }
  }

  // ------------------------------ Globals -----------------------------------
  // Ein globales Game-Objekt, falls anderes Code darauf schaut:
  const Game = (window.Game = window.Game || {});
  Game.version = VERSION;

  // Engine-Status
  const State = {
    ready: false,
    started: false,
    canvas: null,
    ctx: null,
    map: null,
    tileset: null,
    startQueue: null,  // falls Start vor 'ready' gedrückt wurde
  };

  // -------------------------- Engine Bootstrap -------------------------------
  async function initEngine() {
    if (State.ready) return;
    // Falls ihr bereits einen Canvas im DOM habt, greift ihn – sonst erstellen wir keinen (Layout bleibt unberührt)
    const canvasFromDom = document.getElementById('game-canvas');
    if (canvasFromDom instanceof HTMLCanvasElement) {
      State.canvas = canvasFromDom;
      State.ctx = canvasFromDom.getContext('2d');
      log('ok', `game.js initialisiert (${VERSION}) – Canvas gefunden (#game-canvas)`);
    } else {
      // Kein Canvas gefunden: Wir loggen nur, damit klar ist, warum ggf. nichts zu sehen ist.
      log('warn', `Kein Canvas (#game-canvas) im DOM gefunden – Rendering läuft vorerst ohne sichtbare Ausgabe (${VERSION}).`);
    }

    State.ready = true;
    dispatch('cb:engine-ready', { version: VERSION });
    log('ok', `Engine bereit (game.js ${VERSION}) – Event cb:engine-ready gesendet`);

    // Falls während des Ladens bereits start() versucht wurde:
    if (State.startQueue) {
      const queued = State.startQueue;
      State.startQueue = null;
      log('info', `Verarbeite verzögerten Start: ${queued.mapPath}`);
      start(queued.mapPath);
    }
  }

  // Wir initialisieren, sobald DOM parat ist.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngine, { once: true });
  } else {
    // DOM ist schon da
    initEngine();
  }

  // ------------------------------ Loader -------------------------------------
  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  }

  function validateMap(map, src) {
    if (!map || typeof map !== 'object') throw new Error('Map JSON fehlt/ungültig');
    const w = map.width ?? map.mapWidth ?? map.cols ?? 0;
    const h = map.height ?? map.mapHeight ?? map.rows ?? 0;
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      throw new Error('Map: width/height fehlen oder sind 0');
    }
    // Optional: Tilegröße prüfen
    const tile = map.tile || map.tileSize || map.tileWidth || 64;
    return { width: w|0, height: h|0, tile: tile|0 };
  }

  async function loadTilesetFromMap(map) {
    // Versuche, Tileset/Atlas aus der Map zu lesen
    // Erwartete Felder (frei nach euren bisherigen Strukturen): map.tileset, map.atlas, map.tiles
    let info = null;

    if (map.tileset && typeof map.tileset === 'object') {
      info = { ...map.tileset };
    } else if (map.atlas && typeof map.atlas === 'object') {
      info = { ...map.atlas };
    } else if (map.tiles && typeof map.tiles === 'object') {
      info = { ...map.tiles };
    }

    // Fallback auf euer Standard-Set, falls nichts spezifiziert:
    if (!info || (!info.png && !info.image && !info.atlas)) {
      log('warn', 'Atlas nicht angegeben → Fallback-Farben');
      return null; // Engine darf trotzdem starten; Renderer arbeitet mit Platzhalterfarben
    }

    // Häufige Feldnamen normalisieren:
    const imageUrl =
      info.png || info.image || info.atlasPng || info.src || './assets/tiles/tileset.terrain.png';
    const metaUrl =
      info.json || info.meta || info.atlasJson || './assets/tiles/tileset.terrain.json';

    // Nur loggen; tatsächliches Bild-Decoding kann bei euch später passieren
    log('ok', `Tileset/Atlas angegeben → png: ${imageUrl}${metaUrl ? `, meta: ${metaUrl}` : ''}`);

    // Falls Metadaten vorhanden: laden
    let meta = null;
    if (metaUrl) {
      try {
        meta = await fetchJson(metaUrl);
        log('ok', `Tileset-Metadaten geladen (${metaUrl})`);
      } catch (e) {
        log('warn', `Tileset-Metadaten konnten nicht geladen werden (${metaUrl}) – ${e.message}`);
      }
    }

    State.tileset = {
      imageUrl,
      metaUrl,
      meta,
    };
    return State.tileset;
  }

  // ------------------------------ Start --------------------------------------
  async function start(mapPath) {
    // Wird vom UI (Start-Button) gerufen.
    const label = `game.js ${VERSION}`;
    if (!State.ready) {
      log('warn', 'Engine noch nicht bereit – warte auf GameLoader.start …');
      // Einmalige Queue, damit UI nicht in Fehler läuft
      State.startQueue = { mapPath };
      return;
    }

    try {
      log('ok', `GameLoader.start ${mapPath}`);
      const map = await fetchJson(mapPath);
      const dims = validateMap(map, mapPath);
      State.map = { src: mapPath, data: map, ...dims };

      // Tileset / Atlas laden (optional – darf fehlen)
      await loadTilesetFromMap(map);

      // Simples Render-Kickoff (ohne Layout-Eingriff)
      if (State.ctx && State.canvas) {
        // Minimales Clear + Info (nur zum Sichtbarmachen; euer richtiger Renderer kann hier übernehmen)
        State.ctx.clearRect(0, 0, State.canvas.width, State.canvas.height);
        State.ctx.save();
        State.ctx.font = '14px sans-serif';
        State.ctx.fillStyle = '#00a000';
        State.ctx.fillText(`Map OK ${State.map.width}x${State.map.height} tile ${State.map.tile}`, 12, 22);
        State.ctx.restore();
      }

      // Events nach außen
      dispatch('cb:map-loaded', { version: VERSION, mapPath, dims, tileset: State.tileset || null });
      State.started = true;

      // „Game started“ Events/Bridges
      dispatch('cb:game-started', { version: VERSION, mapPath });
      window.GameUI?.onGameStarted?.();

      log('ok', `Game gestartet (${mapPath}) – ${label}`);
    } catch (e) {
      const msg = e?.message || String(e);
      if (/width\/height/.test(msg)) {
        log('err', 'Start fehlgeschlagen: Map: width/height fehlen oder sind 0');
      } else {
        log('err', `Start fehlgeschlagen: ${msg}`);
      }
      // Für UI-Retry/Fehleranzeige nützlich:
      dispatch('cb:game-start-failed', { version: VERSION, mapPath, error: msg });
    }
  }

  // --------------------------- Public API (global) ---------------------------
  window.GameLoader = {
    version: VERSION,
    start, // GameLoader.start('./assets/maps/map-mini.json')
    isReady: () => State.ready,
    isStarted: () => State.started,
    getState: () => ({ ...State }), // Debug/Inspector
  };

  // Für alte Hooks, die den Versionsstring ausgeben:
  try {
    log('ok', `game.js geladen, game.js ${VERSION}`);
  } catch {}

  // Optionaler Auto-Start via URL-Param ?autostart=path
  try {
    const url = new URL(window.location.href);
    const auto = url.searchParams.get('autostart');
    if (auto) {
      // warten bis Engine ready, dann starten
      const kick = () => start(auto);
      if (State.ready) kick();
      else window.addEventListener('cb:engine-ready', kick, { once: true });
      log('info', `Autostart erkannt → ${auto}`);
    }
  } catch {}
})();
