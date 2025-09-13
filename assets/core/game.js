/* ============================================================================
 * Neue Siedler – Core Engine
 * Datei: assets/core/game.js
 * Version: v18.1.2
 * - Engine-State
 * - Gebäude-Bridge (Platzierung + Zeichnen)
 * - Platzhalter-Rechtecke (ohne Rot/Grün)
 * - Hört auf ALLE Build-Events (legacy + modern)
 * ============================================================================ */
(function () {
  'use strict';

  const L = {
    info: (...a) => (window.CBLog?.info  || console.log)('[GameCore]', ...a),
    ok  : (...a) => (window.CBLog?.ok    || console.log)('[GameCore]', ...a),
    warn: (...a) => (window.CBLog?.warn  || console.warn)('[GameCore]', ...a),
    err : (...a) => (window.CBLog?.error || console.error)('[GameCore]', ...a),
  };

  if (window.GameCore?.Engine) { L.warn('bereits initialisiert – skip'); return; }

  const GameCore = (window.GameCore = window.GameCore || {});
  const state = (GameCore.state = GameCore.state || {
    version: '18.1.2',
    map:   { tile: 64, cols: 16, rows: 16, url: null, data: null },
    entities: { buildings: [], _idseq: 0 },
    ui: { started: false }
  });

  const DPR = Math.max(1, window.devicePixelRatio || 1);
  function getCanvas() {
    return document.getElementById('game')
        || document.getElementById('game-canvas')
        || document.querySelector('canvas[data-role="map"]')
        || document.querySelector('canvas');
  }
  function snap(v) {
    const t = state.map.tile || 64;
    return Math.round(v / t) * t;
  }
  function camCenter() {
    const cam = window.GameCamera, cvs = getCanvas();
    if (!cam || !cvs) return { x: 0, y: 0 };
    const w = (cvs.width  / DPR) / (cam.scale || 1);
    const h = (cvs.height / DPR) / (cam.scale || 1);
    return { x: (cam.x || 0) + w / 2, y: (cam.y || 0) + h / 2 };
  }

  // ----- Platzhalter-Farben (vermeidet Rot/Grün) --------------------------
  // admin=blau, food=teal, res=braun, home=grau, mil=violett, deco=gelb, other=indigo
  const CAT_COLOR = {
    admin : 'rgba( 52,152,219,0.55)',   // Blau
    food  : 'rgba( 26,188,156,0.55)',   // Teal
    res   : 'rgba(160, 82, 45,0.55)',   // Braun
    home  : 'rgba(149,165,166,0.55)',   // Grau
    mil   : 'rgba(155, 89,182,0.55)',   // Violett
    deco  : 'rgba(241,196, 15,0.55)',   // Gelb
    other : 'rgba( 63, 81,181,0.55)',   // Indigo
  };
  function kindToCat(kind='') {
    const k = String(kind).toLowerCase();
    if (/(hq|depot|rathaus|townhall)/.test(k)) return 'admin';
    if (/(farm|fisher|windmill|mill|baker|bäckerei)/.test(k)) return 'food';
    if (/(lumber|holzfäll|stone|stein|smith|mine)/.test(k)) return 'res';
    if (/house|wohn/.test(k)) return 'home';
    if (/(guard|tower|wach|kaserne|mil)/.test(k)) return 'mil';
    if (/(tree|gras|wiese|sand|rock|wasser)/.test(k)) return 'deco';
    return 'other';
  }

  // ----- Sprites ----------------------------------------------------------
  const SPRITES = new Map();               // kind → HTMLImageElement | 'error'
  const SPRITE_BASE = 'assets/buildings';  // erwartet <kind>.png

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

  // ----- Platzierung ------------------------------------------------------
  function place(kind, x, y) {
    if (!kind) return null;
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = camCenter(); x = c.x; y = c.y;
    }
    const t = state.map.tile || 64;
    const b = { id: ++state.entities._idseq, kind, x: snap(x), y: snap(y), w: t, h: t };
    loadSprite(kind);                           // Sprite (falls vorhanden) vorladen
    state.entities.buildings.push(b);
    L.info('[place]', kind, '→', b.x, b.y, `(gesamt: ${state.entities.buildings.length})`);
    return b;
  }

  // ----- Zeichnen (vom Renderer aufgerufen) --------------------------------
  // Wenn Sprite fehlt/noch lädt → farbiges Platzhalter-Rect mit Label.
  window.drawEntities = function drawEntities(ctx) {
    const list = state.entities.buildings;
    if (!list || !list.length) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind);
      if (spr && spr !== 'error' && spr.complete) {
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        ctx.save();
        const cat = kindToCat(b.kind);
        ctx.fillStyle = CAT_COLOR[cat] || CAT_COLOR.other;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(b.kind || '???', b.x + 6, b.y + b.h / 2 + 4);
        ctx.restore();
      }
    }
  };

  // ----- Map laden (optional, falls du später Map-Meta nutzen willst) -----
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

  // ----- Events: Höre auf ALLE relevanten Bezeichner ----------------------
  function onBuildAction(ev) {
    const act = ev?.detail?.action || '';
    if (!act || !act.startsWith('place-')) return;
    const kind = act.slice('place-'.length);
    L.info('[evt] build-action:', act, '→ kind:', kind);
    place(kind);
  }
  function onBuildPlace(ev) {
    const d = ev?.detail || {};
    if (!d?.kind) return;
    L.info('[evt] build:place:', d.kind, d.x, d.y);
    place(d.kind, d.x, d.y);
  }
  window.addEventListener('build:action', onBuildAction);
  window.addEventListener('cb:build-action', onBuildAction);
  window.addEventListener('build:place', onBuildPlace);
  window.addEventListener('cb:build:place', onBuildPlace);

  // ----- API & Legacy-Komfort ---------------------------------------------
  GameCore.Engine = { start, stop };
  const Game = (window.Game = window.Game || {});
  Game.place = place;      // Inspector/Konsole: Game.place('farm')
  Game.state = state;

  L.info('Modul geladen env:' + (window.__ENV_VERSION__ || 'unknown'));
})();
