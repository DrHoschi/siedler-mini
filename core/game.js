/* ============================================================================
 * Neue Siedler – Core Engine
 * Datei: core/game.js
 * Version: v18.0.0
 *
 * Zweck
 *  - Zentrale GameCore-Engine (State + Events + Loop)
 *  - Integrierte Gebäude-Bridge (Platzierung + Zeichnen)
 *  - Saubere API für Legacy-Fassade (root/game.js) & Inspector
 *
 * Abhängigkeiten (optional, falls vorhanden)
 *  - assets/core/core.map.js       → GameMap.load(json) / Map-Infos
 *  - assets/core/camera.js         → window.GameCamera {x,y,scale}
 *  - assets/core/core.render.js    → ruft window.drawEntities(ctx) auf
 *  - assets/core/asset.js          → Asset-Layer (bereits bei dir vorhanden)
 *
 * Events (Eingang)
 *  - cb:game-start                 → Engine.start() + Map laden (aus #game[data-map])
 *  - cb:build:place {kind,x,y}     → Gebäude platzieren
 *  - cb:build-action {action}      → Fallback ("place-XYZ")
 *
 * API (Ausgang / global)
 *  - window.GameCore.Engine.start(mapUrl?)
 *  - window.GameCore.Engine.stop()
 *  - window.GameCore.state         → { map, entities, ui, ... }
 *  - window.Game.place(kind, x?, y?) → Komfort-Proxy für Legacy/Inspector
 *  - window.drawEntities(ctx)      → vom Renderer aufgerufen
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
    L.warn('bereits initialisiert – übersprungen.');
    return;
  }

  // ---------- Grundgerüst / State -----------------------------------------
  const GameCore = (window.GameCore = window.GameCore || {});
  const state = (GameCore.state = GameCore.state || {
    version: '18.0.0',
    map: {
      tile: 64,     // Tile-Größe (logisch)
      cols: 16,
      rows: 16,
      url : null,   // gesetzte Map-URL
      data: null,   // geladene JSON-Map (falls vorhanden)
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

  function snapToGrid(v) {
    const t = state.map.tile || 64;
    return Math.round(v / t) * t;
  }

  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('game-canvas') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera;
    const cvs = getCanvas();
    if (!cam || !cvs) return { x: 0, y: 0 };

    // Canvas-Pixel → CSS-Px → Weltkoordinate unter Berücksichtigung des Zooms
    const w = (cvs.width  / DPR) / (cam.scale || 1);
    const h = (cvs.height / DPR) / (cam.scale || 1);
    return { x: (cam.x || 0) + w / 2, y: (cam.y || 0) + h / 2 };
  }

  // ---------- Gebäude-Bridge (integriert) ---------------------------------
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

    // Fallback: zentriert auf aktuelle Kameramitte
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }

    const t = state.map.tile || 64;
    const b = {
      id: ++state.entities._idseq,
      kind,
      x : snapToGrid(x),
      y : snapToGrid(y),
      w : t,
      h : t,
    };

    // Sprite vorladen (lazy draw würde es sonst auch tun)
    loadSprite(kind);

    state.entities.buildings.push(b);
    L.info('Gebäude platziert:', kind, '→', b.x, b.y, '(gesamt:', state.entities.buildings.length, ')');
    return b;
  }

  // Dem Renderer eine einheitliche Zeichen-Funktion geben.
  // Diese wird in assets/core/core.render.js aufgerufen (window.drawEntities(ctx)).
  window.drawEntities = function drawEntities(ctx) {
    const list = state.entities.buildings;
    if (!list || list.length === 0) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind) || loadSprite(b.kind);

      if (spr && spr !== 'error' && spr.complete) {
        // Normales Sprite
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter – gut sichtbar & mit Label
        ctx.save();
        ctx.fillStyle = 'rgba(255, 185, 0, 0.85)';
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

      // Optional: Map-Meta in State übernehmen (tile/cols/rows), wenn vorhanden
      if (json?.tile) state.map.tile = json.tile;
      if (json?.cols) state.map.cols = json.cols;
      if (json?.rows) state.map.rows = json.rows;

      // Falls du ein eigenes Map-Modul nutzt:
      // window.GameMap?.load?.(json);

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

    // Map laden: Präferenz mapUrl, sonst data-map Attribut
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
        // window.GameMap?.load?.(json);
        L.ok('Map geladen (explicit):', mapUrl);
      } catch (e) {
        L.err('Map-Load fehlgeschlagen (explicit):', e?.message || e);
        // als Fallback aus dem Canvas lesen
        await loadMapFromCanvasDataAttr();
      }
    } else {
      await loadMapFromCanvasDataAttr();
    }

    // Renderer initialisieren lassen (dein Renderer hört auf cb:game-start)
    // → Der Start-Button sendet das Event bereits. Für Sicherheit kann man es
    //   erneut feuern, aber doppelte Inits vermeiden wir lieber:
    L.info('Engine ready. (v' + state.version + ')');
  }

  function stop() {
    // Platz für spätere Aufräumarbeiten (Loop, Worker, etc.)
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
  // Für Inspector/Legacy bequem erreichbar:
  const Game = (window.Game = window.Game || {});
  Game.place = placeBuilding;     // Inspector & Tests können Game.place('house') aufrufen
  Game.state = GameCore.state;    // Sichtbarer State (Read-Only verwenden!)

  // ---------- Auto-Start-Hook (falls nötig) --------------------------------
  // Wenn deine App NICHT über ui-start den Start-knopf nutzt, kannst du hier
  // optional auf cb:game-start reagieren. Da dein ui-start bereits dispatcht,
  // lassen wir es kommentiert als Doku stehen:
  //
  // window.addEventListener('cb:game-start', () => {
  //   start(); // Map-URL kommt aus #game[data-map]
  // });

  L.info('Modul geladen env:' + (window.__ENV_VERSION__ || 'unknown'));
})();
