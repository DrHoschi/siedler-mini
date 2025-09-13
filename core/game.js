/* ============================================================================
 * Neue Siedler – Core Engine + Gebäude-Bridge
 * Datei: core/game.js
 * Version: v18.0.0
 *
 * Zweck
 *  - Zentrale GameCore-Engine (State + Events)
 *  - Integrierte Gebäude-Bridge (Platzierung, Preview, Zeichnen)
 *  - Platzhalterfarben pro Kategorie + Preview-Farben (grün/rot)
 *  - Einfache Kollision (1x1 Tile) & Bounds-Check
 *
 * Erwartetes Umfeld
 *  - Canvas: <canvas id="game" data-map="assets/maps/map-mini.json">
 *  - Renderer ruft window.drawEntities(ctx) pro Frame auf (core.render.js)
 *  - UI-Events:  cb:build:place  { kind, x, y }
 *                build:action / cb:build-action { action: 'place-XYZ' }
 * Optional:
 *                cb:build:preview { kind, x, y }  // Maus-/Touch-Preview
 *                cb:build:clearPreview
 * ============================================================================ */

(function(){
  'use strict';

  // ---------- Logging ------------------------------------------------------
  const L = {
    info : (...a)=> (window.CBLog?.info  || console.log)('[GameCore]', ...a),
    ok   : (...a)=> (window.CBLog?.ok    || console.log)('[GameCore]', ...a),
    warn : (...a)=> (window.CBLog?.warn  || console.warn)('[GameCore]', ...a),
    err  : (...a)=> (window.CBLog?.error || console.error)('[GameCore]', ...a),
  };

  if (window.GameCore?.Engine) {
    L.warn('bereits initialisiert – übersprungen.');
    return;
  }

  // ---------- State --------------------------------------------------------
  const GameCore = (window.GameCore = window.GameCore || {});
  const state = (GameCore.state = GameCore.state || {
    version: '18.0.0',
    map: { tile: 64, cols: 16, rows: 16, url: null, data: null },
    entities: {
      buildings: [],           // {id, kind, x, y, w, h}
      _idseq   : 0,
      occupied : new Set(),    // "gx,gy" (grid)
    },
    ui: {
      started: false,
      preview: null            // {kind, x, y, w, h, valid}
    }
  });

  const DPR = Math.max(1, window.devicePixelRatio || 1);
  const TILE = ()=> state.map.tile || 64;

  // ---------- Kategorien & Farben -----------------------------------------
  // Mapping deiner Kinds → Kategorien (nur Beispiele, gern erweitern)
  const CATEGORY_BY_KIND = {
    'hq'           : 'verwaltung',
    'house'        : 'wohnen',
    'wohnhaus'     : 'wohnen',
    'depot'        : 'verwaltung',
    'fisher'       : 'nahrung',
    'farm'         : 'nahrung',
    'windmill'     : 'nahrung',
    'lumberjack'   : 'rohstoffe',
    'stonecutter'  : 'rohstoffe',
    'smith'        : 'rohstoffe',
    'guardtower'   : 'militaer',
    'road'         : 'infra',
    'road-curve'   : 'infra',
    'road-cross'   : 'infra',
    // Fallback:
    'default'      : 'sonst'
  };

  // Plazierte Gebäude – Platzhalterfarben pro Kategorie
  const COLOR_BY_CATEGORY = {
    verwaltung : 'rgba( 52,152,219,0.85)', // blau
    nahrung    : 'rgba( 46,204,113,0.85)', // grün
    rohstoffe  : 'rgba(155, 89,182,0.85)', // lila
    wohnen     : 'rgba(241,196, 15,0.85)', // gelb
    infra      : 'rgba(127,140,141,0.85)', // grau
    militaer   : 'rgba(231, 76, 60,0.85)', // rot
    sonst      : 'rgba( 26,188,156,0.85)', // türkis
  };

  // Preview-Farben: gültig/ungültig
  const COLOR_PREVIEW_OK    = 'rgba( 46,204,113,0.55)';  // grün, halbtransparent
  const COLOR_PREVIEW_BLOCK = 'rgba(231, 76, 60,0.55)';  // rot, halbtransparent

  // ---------- Utils --------------------------------------------------------
  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('game-canvas') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function snapToGrid(v) { return Math.round(v / TILE()) * TILE(); }

  function keyOfGrid(x, y) {
    const gx = Math.floor(x / TILE());
    const gy = Math.floor(y / TILE());
    return `${gx},${gy}`;
  }

  function isInsideMap(x, y) {
    const gx = Math.floor(x / TILE());
    const gy = Math.floor(y / TILE());
    return gx >= 0 && gy >= 0 && gx < state.map.cols && gy < state.map.rows;
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera;
    const cvs = getCanvas();
    if (!cam || !cvs) return { x: 0, y: 0 };
    const w = (cvs.width  / DPR) / (cam.scale || 1);
    const h = (cvs.height / DPR) / (cam.scale || 1);
    return { x: (cam.x || 0) + w/2, y: (cam.y || 0) + h/2 };
  }

  // ---------- Sprites (optional) ------------------------------------------
  const SPRITE_BASE = 'assets/buildings';
  const SPRITES = new Map();  // kind → HTMLImageElement | 'error'

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

  // ---------- Belegung & Kollision (1x1 Tile) -----------------------------
  function occupy(b) {
    state.entities.occupied.add(keyOfGrid(b.x, b.y));
  }
  function free(b) {
    state.entities.occupied.delete(keyOfGrid(b.x, b.y));
  }
  function isOccupiedAt(x, y) {
    return state.entities.occupied.has(keyOfGrid(x, y));
  }

  function canPlace(kind, x, y) {
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    if (!isInsideMap(snappedX, snappedY)) return false;
    if (isOccupiedAt(snappedX, snappedY)) return false;
    // hier später: Terrain-Checks, Verbotszonen, Straßenlogik …
    return true;
  }

  // ---------- Platzieren / Preview ----------------------------------------
  function placeBuilding(kind, x, y) {
    if (!kind) return null;

    // default: Kamera-Mitte
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld(); x = c.x; y = c.y;
    }
    const sx = snapToGrid(x), sy = snapToGrid(y);
    if (!canPlace(kind, sx, sy)) {
      L.warn('Platzieren blockiert:', kind, sx, sy);
      return null;
    }

    const t = TILE();
    const b = { id: ++state.entities._idseq, kind, x: sx, y: sy, w: t, h: t };

    // Sprite (wenn vorhanden) vorladen; ansonsten Platzhalterfarbe
    loadSprite(kind);

    state.entities.buildings.push(b);
    occupy(b);
    L.info('Gebäude platziert:', kind, '→', sx, sy, '(gesamt:', state.entities.buildings.length, ')');
    return b;
  }

  function setPreview(kind, x, y) {
    if (!kind) { state.ui.preview = null; return; }
    const sx = snapToGrid(x), sy = snapToGrid(y);
    state.ui.preview = {
      kind, x: sx, y: sy, w: TILE(), h: TILE(),
      valid: canPlace(kind, sx, sy)
    };
  }
  function clearPreview(){ state.ui.preview = null; }

  // ---------- Zeichnen (vom Renderer aufgerufen) --------------------------
  window.drawEntities = function drawEntities(ctx) {
    // 1) Bereits platzierte Gebäude
    for (const b of state.entities.buildings) {
      const cat = CATEGORY_BY_KIND[b.kind] || CATEGORY_BY_KIND.default;
      const col = COLOR_BY_CATEGORY[cat]   || COLOR_BY_CATEGORY.sonst;
      const spr = SPRITES.get(b.kind) || loadSprite(b.kind);

      if (spr && spr !== 'error' && spr.complete) {
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        ctx.save();
        ctx.fillStyle = col;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(b.kind || '???', b.x + 6, b.y + b.h/2 + 4);
        ctx.restore();
      }
    }

    // 2) Preview (wenn vorhanden) – halbtransparent, grün/rot
    const p = state.ui.preview;
    if (p) {
      ctx.save();
      ctx.fillStyle   = p.valid ? COLOR_PREVIEW_OK : COLOR_PREVIEW_BLOCK;
      ctx.strokeStyle = p.valid ? 'rgba(46,204,113,0.9)' : 'rgba(231,76,60,0.9)';
      ctx.lineWidth = 2;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
      ctx.fillStyle = '#111';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(p.kind, p.x + 6, p.y + p.h/2 + 4);
      ctx.restore();
    }
  };

  // ---------- Map laden ----------------------------------------------------
  async function loadMap(mapUrl) {
    const url = mapUrl || getCanvas()?.getAttribute('data-map') || 'assets/maps/map-mini.json';
    state.map.url = url;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      state.map.data = json;
      if (json?.tile) state.map.tile = json.tile;
      if (json?.cols) state.map.cols = json.cols;
      if (json?.rows) state.map.rows = json.rows;
      L.ok('Map geladen:', url);
      return true;
    } catch (e) {
      L.err('Map-Load fehlgeschlagen:', e?.message || e);
      return false;
    }
  }

  // ---------- Engine API ---------------------------------------------------
  async function start(mapUrl){
    if (state.ui.started) return;
    state.ui.started = true;
    await loadMap(mapUrl);
    L.info('Engine ready. (v'+state.version+')');
  }

  function stop(){
    state.ui.started = false;
    L.warn('Engine gestoppt.');
  }

  // ---------- Event-Brücken aus dem UI ------------------------------------
  // Moderner Weg
  window.addEventListener('cb:build:place', (ev) => {
    const d = ev?.detail || {};
    placeBuilding(d.kind, d.x, d.y);
  });

  // Preview (optional, falls UI dies sendet)
  window.addEventListener('cb:build:preview', (ev) => {
    const d = ev?.detail || {};
    if (typeof d.x === 'number' && typeof d.y === 'number' && d.kind) {
      setPreview(d.kind, d.x, d.y);
    }
  });
  window.addEventListener('cb:build:clearPreview', clearPreview);

  // Legacy/Fallback
  function onBuildAction(ev){
    const d = ev?.detail || {};
    const act = d.action || '';
    if (!act) return;
    if (act.startsWith('place-')) {
      const kind = act.slice('place-'.length);
      placeBuilding(kind);           // ohne Koordinaten → Kamera-Mitte
    }
    // Optional: wenn dein UI eine Hover-Preview via 'preview-XYZ' senden würde:
    // if (act.startsWith('preview-')) { ... setPreview(...) ... }
  }
  window.addEventListener('build:action', onBuildAction);
  window.addEventListener('cb:build-action', onBuildAction);

  // ---------- Öffentliche API ---------------------------------------------
  GameCore.Engine = { start, stop };
  const Game = (window.Game = window.Game || {});
  Game.place       = placeBuilding;
  Game.canPlaceAt  = canPlace;
  Game.setPreview  = setPreview;
  Game.clearPreview= clearPreview;
  Game.state       = GameCore.state;

  L.info('Modul geladen env:' + (window.__ENV_VERSION__ || 'unknown'));
})();
