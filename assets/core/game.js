/* ============================================================================
 * Neue Siedler – Core Engine (+ integrierte Gebäude-Bridge)
 * Datei: assets/core/game.js
 * Version: v18.1.0
 *
 * Was macht diese Datei?
 *  - Hält den zentralen Game-State (map/entities/ui).
 *  - Bindet Build-Events (modern + legacy) und platziert Gebäude.
 *  - Stellt window.drawEntities(ctx) bereit (Renderer ruft das auf).
 *  - Vermeidet Doppel-Init und mischt keine "leeren" Closures ins Rendern.
 *
 * Wichtig:
 *  - Der Renderer (assets/core/core.render.js) ruft NUR window.drawEntities(ctx) auf.
 *  - drawEntities liest den State IMMER aus window.GameCore.state (sicher!).
 *  - Platzhalter-Farben kommen aus einer Kategorie-Tabelle (ohne Rot/Grün).
 * ============================================================================ */

(() => {
  'use strict';

  const L = {
    info : (...a)=> (window.CBLog?.info  || console.log)('[GameCore]', ...a),
    ok   : (...a)=> (window.CBLog?.ok    || console.log)('[GameCore]', ...a),
    warn : (...a)=> (window.CBLog?.warn  || console.warn)('[GameCore]', ...a),
    err  : (...a)=> (window.CBLog?.error || console.error)('[GameCore]', ...a),
  };

  // Schon mal geladen?
  if (window.GameCore?.__engine_ready__) {
    L.info('bereits initialisiert – skip Engine-Init (Bridge bleibt aktiv).');
    // Trotzdem sicherstellen, dass drawEntities existiert und sicher auf den globalen State zugreift:
    if (typeof window.drawEntities !== 'function') {
      window.drawEntities = safeDrawEntitiesFactory();
    }
    // Falls Events noch nicht gebunden waren:
    bindBuildEventsOnce();
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Globaler Namespace + State
  // ──────────────────────────────────────────────────────────────────────────
  const GameCore = (window.GameCore = window.GameCore || {});
  const state = (GameCore.state = GameCore.state || {
    version: '18.1.0',
    map:   { tile: 64, cols: 16, rows: 16, url: null, data: null },
    ui:    { started: false },
    entities: { _idseq: 0, buildings: [] }, // [{id, kind, cat, x,y,w,h}]
  });

  GameCore.__engine_ready__ = true;

  // ──────────────────────────────────────────────────────────────────────────
  // Platzhalter-Farben je Kategorie (KEIN Rot/Grün!)
  // ──────────────────────────────────────────────────────────────────────────
  const CATEGORY_COLOR = {
    administration : '#8e6cff', // Verwaltung
    housing        : '#5ac8fa', // Wohnen
    food           : '#ffcc00', // Nahrung (gelb/gold)
    resources      : '#ff8a00', // Rohstoffe
    infrastructure : '#a0b3b0', // Straßen etc.
    military       : '#ff3b30', // Militär (rot — nur Platzhalteranzeige, nicht "platzierbar")
    decor          : '#b8e986', // Deko/Landschaft (grünstichig, NICHT für Platzier-Status)
    default        : '#d1d1d6'
  };

  // Mapping: kind → Kategorie
  const KIND2CAT = {
    // Verwaltung
    hq: 'administration', depot: 'administration',
    // Nahrung
    farm: 'food', fisher: 'food', windmill: 'food',
    // Rohstoffe
    lumberjack: 'resources', stonecutter: 'resources', smith: 'resources',
    // Wohnen
    house: 'housing',
    // Infrastruktur
    road: 'infrastructure', 'road-curve':'infrastructure', 'road-cross':'infrastructure',
    // Militär
    guardtower: 'military',
    // Deko
    grass:'decor', meadow:'decor', rock:'decor', sand:'decor', water:'decor'
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Utils
  // ──────────────────────────────────────────────────────────────────────────
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function snapToGrid(v) {
    const t = GameCore.state?.map?.tile || 64;
    return Math.round(v / t) * t;
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera;
    const cvs = getCanvas();
    if (!cam || !cvs) return { x: 0, y: 0 };

    const w = (cvs.width  / DPR) / (cam.scale || cam.zoom || 1);
    const h = (cvs.height / DPR) / (cam.scale || cam.zoom || 1);
    return { x: (cam.x || 0) + w/2, y: (cam.y || 0) + h/2 };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Gebäude-Bridge
  // ──────────────────────────────────────────────────────────────────────────
  const SPRITES = new Map(); // kind → HTMLImageElement | 'error'
  const SPRITE_BASE = 'assets/buildings';

  function loadSprite(kind) {
    if (!kind) return null;
    if (SPRITES.has(kind)) return SPRITES.get(kind);
    const img = new Image();
    img.onload  = () => L.ok('Sprite geladen:', kind);
    img.onerror = () => { SPRITES.set(kind, 'error'); L.warn('Sprite fehlt:', kind); };
    img.src = `${SPRITE_BASE}/${kind}.png`;
    SPRITES.set(kind, img);
    return img;
  }

  function placeBuilding(kind, x, y) {
    if (!kind) return null;

    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }

    const t = GameCore.state?.map?.tile || 64;
    const cat = KIND2CAT[kind] || 'default';
    const b = {
      id: ++state.entities._idseq,
      kind,
      cat,
      x : snapToGrid(x),
      y : snapToGrid(y),
      w : t,
      h : t,
    };

    loadSprite(kind); // optionales Vorladen
    state.entities.buildings.push(b);
    L.info('Gebäude platziert:', kind, '→', b.x, b.y, '(gesamt:', state.entities.buildings.length, ')');
    return b;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Sichere drawEntities-Factory (immer globalen State nutzen!)
  // ──────────────────────────────────────────────────────────────────────────
  function safeDrawEntitiesFactory() {
    return function drawEntities(ctx) {
      const coreState = window.GameCore?.state;
      const list = coreState?.entities?.buildings;
      if (!Array.isArray(list) || list.length === 0) return;

      for (const b of list) {
        const spr = SPRITES.get(b.kind) || loadSprite(b.kind);

        if (spr && spr !== 'error' && spr.complete) {
          ctx.drawImage(spr, b.x, b.y, b.w, b.h);
          continue;
        }

        // Platzhalter mit Kategorie-Farben
        const fill = CATEGORY_COLOR[b.cat] || CATEGORY_COLOR.default;
        const stroke = 'rgba(0,0,0,0.7)';

        ctx.save();
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;

        // fester Alphawert: gleichmäßige Sichtbarkeit
        ctx.globalAlpha = 0.9;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.globalAlpha = 1.0;

        // Rahmen + Label
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(b.kind, b.x + 6, b.y + b.h/2 + 4);
        ctx.restore();
      }
    };
  }

  // drawEntities global setzen (einmalig, sicher)
  window.drawEntities = safeDrawEntitiesFactory();

  // ──────────────────────────────────────────────────────────────────────────
  // Events binden (nur 1x)
  // ──────────────────────────────────────────────────────────────────────────
  function bindBuildEventsOnce() {
    if (window.__build_events_bound__) return;
    window.__build_events_bound__ = true;

    // Moderner Weg: explizite Koordinaten möglich
    window.addEventListener('cb:build:place', (ev) => {
      const d = ev?.detail || {};
      placeBuilding(d.kind, d.x, d.y);
    });

    // Legacy-Weg: "place-…"
    const onBuildAction = (ev) => {
      const act = ev?.detail?.action || '';
      if (!act.startsWith('place-')) return;
      const kind = act.slice('place-'.length);
      placeBuilding(kind);
    };
    window.addEventListener('build:action', onBuildAction);
    window.addEventListener('cb:build-action', onBuildAction);

    L.info('Build-Events gebunden.');
  }
  bindBuildEventsOnce();

  // ──────────────────────────────────────────────────────────────────────────
  // Öffentliche API
  // ──────────────────────────────────────────────────────────────────────────
  GameCore.Engine = {
    start: async (mapUrl) => {
      if (state.ui.started) return;
      state.ui.started = true;

      // (Optional) Map laden, falls benötigt – dein ui-start lädt ohnehin.
      if (mapUrl) {
        try {
          const res = await fetch(mapUrl, { cache: 'no-store' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const json = await res.json();
          state.map.data = json;
          state.map.url  = mapUrl;
          if (json?.tile) state.map.tile = json.tile;
          if (json?.cols) state.map.cols = json.cols;
          if (json?.rows) state.map.rows = json.rows;
          L.ok('Map geladen (explicit):', mapUrl);
        } catch (e) {
          L.err('Map-Load fehlgeschlagen (explicit):', e?.message || e);
        }
      }

      L.info('Engine ready. (v' + state.version + ')');
    },
    stop: () => {
      state.ui.started = false;
      L.warn('Engine gestoppt.');
    }
  };

  // Komfort-Proxy für Inspector/Legacy:
  const Game = (window.Game = window.Game || {});
  Game.place = placeBuilding;
  Game.state = GameCore.state;

  L.info('Modul geladen env:' + (window.__ENV_VERSION__ || 'unknown'));
})();
