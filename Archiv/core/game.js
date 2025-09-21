/* ============================================================================
 * Neue Siedler – Core Engine
 * Datei: assets/core/game.js
 * Version: v18.1.0
 *
 * Zweck
 *  - Zentrale GameCore-Engine (State + Events + Start)
 *  - Integrierte Gebäude-Bridge (Platzierung + Zeichnen)
 *  - Platzhalterfarben je Kategorie (kein Rot/Grün!)
 *
 * Abhängigkeiten (optional, falls vorhanden)
 *  - assets/core/camera.js         → window.GameCamera {x,y,scale}
 *  - assets/core/core.render.js    → ruft window.drawEntities(ctx) auf
 *  - assets/core/core.map.js / asset.js → optional
 *
 * Eingangs-Events
 *  - cb:game-start                 → Engine.start() (Map aus #game[data-map])
 *  - cb:build:place {kind,x,y}     → Gebäude platzieren (moderner Weg)
 *  - build:action / cb:build-action{action:'place-…'} → Fallback
 *
 * Öffentliche API
 *  - window.GameCore.Engine.start(mapUrl?)
 *  - window.GameCore.Engine.stop()
 *  - window.GameCore.state
 *  - window.Game.place(kind, x?, y?)
 *  - window.drawEntities(ctx)  ← vom Renderer aufgerufen
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

  // Doppel-Init verhindern
  if (window.GameCore?.Engine) {
    L.warn('bereits initialisiert – skip');
    return;
  }

  // ---------- Grundgerüst / State -----------------------------------------
  const GameCore = (window.GameCore = window.GameCore || {});
  const state = (GameCore.state = GameCore.state || {
    version: '18.1.0',
    map: {
      tile: 64,
      cols: 16,
      rows: 16,
      url : null,
      data: null,
    },
    entities: {
      buildings: [],  // {id, kind, x, y, w, h}
      _idseq   : 0,
    },
    ui: {
      started: false,
    }
  });

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

  function snapToGrid(v) {
    const t = state.map.tile || 64;
    return Math.round(v / t) * t;
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera;
    const cvs = getCanvas();
    if (!cam || !cvs) return { x: 0, y: 0 };
    const w = (cvs.width  / DPR) / (cam.scale || 1);
    const h = (cvs.height / DPR) / (cam.scale || 1);
    return { x: (cam.x || 0) + w/2, y: (cam.y || 0) + h/2 };
  }

  // ---------- Kategorien & Platzhalterfarben -------------------------------
  // Wichtig: KEIN Rot/Grün hier verwenden (reserviert für Platzierbar-Status)
  const CATEGORY_BY_KIND = {
    // Verwaltung / Allg.
    hq: 'admin', rathaus: 'admin', depot: 'admin',
    // Nahrung
    farm: 'food', fisher: 'food', fish: 'food', windmill: 'food', mill: 'food',
    // Rohstoffe
    lumberjack: 'raw', woodcutter: 'raw', stonecutter: 'raw', quarry: 'raw', smith: 'raw',
    // Wohnen
    house: 'housing', wohnhaus: 'housing',
    // Infrastruktur
    road: 'infra', 'road-curve': 'infra', 'road-cross': 'infra',
    // Deko / Landschaft (meist paint-…)
    'paint-grass': 'deco', grass: 'deco', meadow: 'deco', rock: 'deco',
    sand: 'deco', shore: 'deco', water: 'deco', 'paint-meadow': 'deco',
    'paint-rock': 'deco', 'paint-sand': 'deco', 'paint-water': 'deco',
    // Militär
    guardtower: 'mil'
  };

  const COLOR_BY_CAT = {
    admin  : { fill:'rgba( 66,135,245,0.80)', stroke:'rgba( 25, 60,120,0.85)' }, // Blau
    food   : { fill:'rgba(245,160, 66,0.80)', stroke:'rgba(140, 85, 20,0.85)' }, // Orange
    raw    : { fill:'rgba(120,120,120,0.80)', stroke:'rgba( 40, 40, 40,0.85)' }, // Grau
    housing: { fill:'rgba(160, 66,245,0.80)', stroke:'rgba( 80, 25,120,0.85)' }, // Violett
    infra  : { fill:'rgba( 66,245,212,0.80)', stroke:'rgba( 20,110,100,0.85)' }, // Türkis
    deco   : { fill:'rgba(150,100, 50,0.80)', stroke:'rgba( 70, 40, 20,0.85)' }, // Braun
    mil    : { fill:'rgba( 30, 30, 30,0.85)', stroke:'rgba(255,255,255,0.25)' }, // Fast Schwarz
    // Fallback
    other  : { fill:'rgba(255,185,  0,0.80)', stroke:'rgba(  0,  0,  0,0.70)' }  // Gold
  };

  function getCategory(kind='') {
    const k = String(kind || '').toLowerCase();
    return CATEGORY_BY_KIND[k] || 'other';
  }

  function getPlaceholderStyle(kind) {
    return COLOR_BY_CAT[getCategory(kind)] || COLOR_BY_CAT.other;
  }

  // ---------- Gebäude-Bridge ----------------------------------------------
  const SPRITE_BASE = 'assets/buildings';  // erwartet <kind>.png
  const SPRITES = new Map();               // kind → HTMLImageElement | 'error'

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

    const t = state.map.tile || 64;
    const b = {
      id  : ++state.entities._idseq,
      kind,
      x   : snapToGrid(x),
      y   : snapToGrid(y),
      w   : t,
      h   : t
    };

    loadSprite(kind); // lazy preload
    state.entities.buildings.push(b);
    L.info('Gebäude platziert:', kind, '→', b.x, b.y, '(gesamt:', state.entities.buildings.length, ')');
    return b;
  }

  // Vom Renderer aufgerufen:
  window.drawEntities = function drawEntities(ctx) {
    const list = state.entities.buildings;
    if (!list || list.length === 0) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind) || loadSprite(b.kind);

      if (spr && spr !== 'error' && spr.complete) {
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter in Kategorie-Farbe zeichnen
        const { fill, stroke } = getPlaceholderStyle(b.kind);
        ctx.save();
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        // Label
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText((b.kind || '???'), b.x + 6, b.y + Math.floor(b.h/2) + 4);
        ctx.restore();
      }
    }
  };

  // ---------- Map / Start --------------------------------------------------
  async function loadMapFromCanvasDataAttr() {
    const cvs = getCanvas();
    const url = cvs?.getAttribute('data-map') || 'assets/maps/map-mini.json';
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

  async function start(mapUrl) {
    if (state.ui.started) return;
    state.ui.started = true;

    if (mapUrl) {
      state.map.url = mapUrl;
      try {
        const res = await fetch(mapUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        state.map.data = json;
        if (json?.tile) state.map.tile = json.tile;
        if (json?.cols) state.map.cols = json.cols;
        if (json?.rows) state.map.rows = json.rows;
        L.ok('Map geladen (explicit):', mapUrl);
      } catch (e) {
        L.err('Map-Load fehlgeschlagen (explicit):', e?.message || e);
        await loadMapFromCanvasDataAttr();
      }
    } else {
      await loadMapFromCanvasDataAttr();
    }

    L.info('Engine ready. (v' + state.version + ')');
  }

  function stop() {
    state.ui.started = false;
    L.warn('Engine gestoppt.');
  }

  // ---------- Events aus dem UI -------------------------------------------
  // Moderner Weg
  window.addEventListener('cb:build:place', (ev) => {
    const d = ev?.detail || {};
    placeBuilding(d.kind, d.x, d.y);
  });

  // Legacy Fallback (ui-build sendet "build:action" oder "cb:build-action")
  function onBuildAction(ev) {
    const d = ev?.detail || {};
    const act = d.action || '';
    if (!act || !act.startsWith('place-')) return;
    const kind = act.slice('place-'.length);
    placeBuilding(kind);
  }
  window.addEventListener('build:action', onBuildAction);
  window.addEventListener('cb:build-action', onBuildAction);

  // ---------- Öffentliche API ---------------------------------------------
  GameCore.Engine = { start, stop };
  const Game = (window.Game = window.Game || {});
  Game.place = placeBuilding;   // Inspector/Legacy
  Game.state = GameCore.state;  // Read-Only nutzen

  L.info('Modul geladen env:' + (window.__ENV_VERSION__ || 'unknown'));
})();
