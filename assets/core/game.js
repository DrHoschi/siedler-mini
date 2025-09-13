/* ============================================================================
 * Neue Siedler – Core Engine (+ integrierte Gebäude-Bridge)
 * Datei: assets/core/game.js
 * Version: v18.0.1
 *
 * - Zentrale State-Struktur (GameCore.state)
 * - Platzieren von Gebäuden (Events + API)
 * - Zeichnen von Entities via window.drawEntities(ctx)
 * - Robuste Event-Bindings (window + document; modern + legacy)
 * - Platzhalterfarben aus Kategorien (ohne Rot/Grün)
 * ============================================================================ */
(function () {
  'use strict';

  // ---------- Logging ------------------------------------------------------
  const L = {
    info : (...a)=> (window.CBLog?.info  || console.log)('[GameCore]', ...a),
    ok   : (...a)=> (window.CBLog?.ok    || console.log)('[GameCore]', ...a),
    warn : (...a)=> (window.CBLog?.warn  || console.warn)('[GameCore]', ...a),
    err  : (...a)=> (window.CBLog?.error || console.error)('[GameCore]', ...a),
  };

  if (window.GameCore?.Engine) {
    L.info('bereits initialisiert – skip Engine-Init (Bridge ist aktiv).');
    // Trotzdem sicherstellen, dass drawEntities existiert:
    if (typeof window.drawEntities !== 'function') {
      window.drawEntities = () => {};
    }
    return;
  }

  // ---------- State --------------------------------------------------------
  const GameCore = (window.GameCore = window.GameCore || {});
  const state = (GameCore.state = GameCore.state || {
    version: '18.0.1',
    map: { tile: 64, cols: 16, rows: 16, url: null, data: null },
    entities: { buildings: [], _idseq: 0 },
    ui: { started: false }
  });

  // ---------- Kategorie → Platzhalterfarben --------------------------------
  // KEIN Rot/Grün (für Platzierbar/Blockiert reserviert)
  const CAT_COLORS = {
    verwaltung:  { fill: 'rgba( 52, 152, 219, .80)', stroke: 'rgba( 41, 128, 185, .90)' }, // Blau
    nahrung:     { fill: 'rgba(155,  89, 182, .80)', stroke: 'rgba(142,  68, 173, .90)' }, // Lila
    rohstoffe:   { fill: 'rgba(230, 126,  34, .80)', stroke: 'rgba(211,  84,   0, .90)' }, // Orange
    wohnen:      { fill: 'rgba(241, 196,  15, .80)', stroke: 'rgba(243, 156,  18, .90)' }, // Gelb
    infrastruktur:{fill: 'rgba(127, 140, 141, .80)', stroke: 'rgba( 44,  62,  80, .90)' }, // Grau
    deko:        { fill: 'rgba( 46, 204, 113, .80)', stroke: 'rgba( 39, 174,  96, .90)' }, // Smaragd
    default:     { fill: 'rgba(255, 185,   0, .80)', stroke: 'rgba(  0,   0,   0, .55)' }  // Gold/Schwarz
  };

  // Zuordnung gebäudekind -> Kategorie
  const KIND2CAT = {
    // Verwaltung
    hq: 'verwaltung', depot: 'verwaltung',
    // Nahrung
    farm: 'nahrung', fisher: 'nahrung', windmill: 'nahrung',
    // Rohstoffe
    lumberjack: 'rohstoffe', stonecutter: 'rohstoffe', smith: 'rohstoffe',
    // Wohnen
    house: 'wohnen',
    // Infrastruktur
    road: 'infrastruktur', 'road-curve': 'infrastruktur', 'road-cross': 'infrastruktur',
    // Deko / Landschaft
    grass: 'deko', meadow: 'deko', rock: 'deko', sand: 'deko', water: 'deko'
  };

  function colorFor(kind) {
    const cat = KIND2CAT[kind] || 'default';
    return CAT_COLORS[cat] || CAT_COLORS.default;
  }

  // ---------- Utils --------------------------------------------------------
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('game-canvas') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera || {};
    const cvs = getCanvas();
    if (!cvs) return { x: 0, y: 0 };
    const scale = (cam.scale ?? cam.zoom ?? 1) || 1;
    const w = (cvs.width  / DPR) / scale;
    const h = (cvs.height / DPR) / scale;
    return { x: (cam.x || 0) + w / 2, y: (cam.y || 0) + h / 2 };
  }

  function snapToGrid(v) {
    const t = state.map.tile || 64;
    return Math.round(v / t) * t;
  }

  // ---------- Sprites (optional) ------------------------------------------
  const SPRITE_BASE = 'assets/buildings';
  const SPRITES = new Map(); // kind -> HTMLImageElement | 'error'

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

  // ---------- Platzieren ---------------------------------------------------
  function placeBuilding(kind, x, y) {
    if (!kind) return null;

    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }

    const t = state.map.tile || 64;
    const b = {
      id: ++state.entities._idseq,
      kind,
      x: snapToGrid(x),
      y: snapToGrid(y),
      w: t, h: t
    };

    loadSprite(kind); // optionales Vorladen
    state.entities.buildings.push(b);
    L.info('Gebäude platziert:', kind, '→', b.x, b.y, '(gesamt:', state.entities.buildings.length, ')');
    return b;
  }

  // ---------- Zeichnen der Entities ---------------------------------------
  window.drawEntities = function drawEntities(ctx) {
    const list = state.entities.buildings;
    if (!list || list.length === 0) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind);
      if (spr && spr !== 'error' && spr.complete) {
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
        continue;
      }

      // Platzhalter (farbig je Kategorie)
      const col = colorFor(b.kind);
      ctx.save();
      ctx.fillStyle = col.fill;
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth = 2;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
      // Label
      ctx.fillStyle = '#111';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText(b.kind, b.x + 6, b.y + b.h / 2 + 4);
      ctx.restore();
    }
  };

  // ---------- Event-Bindings (robust) -------------------------------------
  function extractKind(detail) {
    // {kind} direkt?
    if (detail && typeof detail.kind === 'string' && detail.kind) return detail.kind;
    // {action:'place-XYZ'}?
    const act = detail && detail.action;
    if (typeof act === 'string' && act.startsWith('place-')) return act.slice(6);
    return null;
  }

  function handleBuildPlace(ev) {
    const kind = extractKind(ev?.detail || {});
    if (!kind) { L.warn('cb:build:place ohne kind'); return; }
    L.ok('Event empfangen: cb:build:place →', kind);
    placeBuilding(kind);
  }

  function handleBuildAction(ev) {
    const kind = extractKind(ev?.detail || {});
    if (!kind) return;
    L.ok('Event empfangen: (legacy) build-action →', kind);
    placeBuilding(kind);
  }

  function bindBuildEvents() {
    // Modern
    window.addEventListener('cb:build:place', handleBuildPlace);
    document.addEventListener('cb:build:place', handleBuildPlace);

    // Legacy (zwei Schreibweisen)
    window.addEventListener('cb:build-action', handleBuildAction);
    document.addEventListener('cb:build-action', handleBuildAction);
    window.addEventListener('build:action', handleBuildAction);
    document.addEventListener('build:action', handleBuildAction);

    L.info('Build-Events gebunden.');
  }

  bindBuildEvents();

  // ---------- API ----------------------------------------------------------
  GameCore.Engine = {
    start: async function start(mapUrl) {
      if (state.ui.started) return;
      state.ui.started = true;
      if (mapUrl) state.map.url = mapUrl;
      L.info('Engine ready. (v' + state.version + ')');
    },
    stop: function stop(){
      state.ui.started = false;
      L.warn('Engine gestoppt.');
    }
  };

  // Legacy/Inspector Kompatibilität
  const Game = (window.Game = window.Game || {});
  Game.place = placeBuilding;
  Game.state = state;

  L.info('Modul geladen env:' + (window.__ENV_VERSION__ || 'unknown'));
})();
