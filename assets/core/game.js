/* ============================================================================
 * assets/core/game.js  —  v17.10.0
 * "GameCore": Welt-State, Map-Load, Build-Events, Ressourcen, Loop/Tick
 * Kompatibel mit:
 *   - Legacy Fassade (root ./game.js) → ruft GameCore.Engine.start(mapUrl)
 *   - core.render.js → ruft window.drawEntities(ctx) zum Zeichnen der Gebäude
 *   - ui-build.js → feuert cb:build-action / cb:build:place
 *   - Inspector (Logs/Events)
 * ============================================================================ */
(function () {
  'use strict';

  const TAG  = '[GameCore]';
  const log  = (...a)=> (window.CBLog?.info || console.log)(TAG, ...a);
  const ok   = (...a)=> (window.CBLog?.ok   || console.log)(TAG, ...a);
  const warn = (...a)=> (window.CBLog?.warn || console.warn)(TAG, ...a);
  const err  = (...a)=> (window.CBLog?.err  || console.error)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // Öffentliche Struktur
  // ---------------------------------------------------------------------------
  const GameCore = (window.GameCore = window.GameCore || {});
  GameCore.state = GameCore.state || {
    version  : 'v17.10.0',
    running  : false,
    time     : 0,              // ms seit Start
    dt       : 16,             // letzter delta(ms)
    map      : {               // Map-Metadaten + Gitter
      url   : '',
      tile  : 64,              // TileSize → Tileset
      cols  : 0,
      rows  : 0,
      grid  : [],              // optionales Belegungsraster (0=leer,1=block)
    },
    camera   : { x:0, y:0, scale:1 }, // wird primär in camera.js verwaltet
    resources: { wood:0, stone:0, wheat:0, fish:0 },
    buildings: [],             // {id, kind, x, y, w, h, sprite?}
    units    : [],             // (Platzhalter)
  };

  // Laufzeit
  let _raf = 0;
  let _last = 0;
  let _idSeq = 0;

  // Sprite-Cache (Gebäude)
  const SPRITE_BASE = 'assets/buildings';
  const SPRITES = new Map(); // kind -> HTMLImageElement | 'error'

  function loadSprite(kind) {
    if (SPRITES.has(kind)) return SPRITES.get(kind);
    const img = new Image();
    img.onload  = ()=> ok('[sprite] geladen:', kind);
    img.onerror = ()=> { SPRITES.set(kind, 'error'); warn('[sprite] fehlt:', `${kind}.png`); };
    img.src = `${SPRITE_BASE}/${kind}.png`;
    SPRITES.set(kind, img);
    return img;
  }

  // ---------------------------------------------------------------------------
  // Map laden (leichtgewichtig; Renderer lädt Tileset separat)
  // Erwartetes JSON (min.): { tileSize, cols, rows, blocks?: number[][] }
  // ---------------------------------------------------------------------------
  async function loadMap(url) {
    try {
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const tile = Number(json.tileSize || json.tile || GameCore.state.map.tile || 64);
      const cols = Number(json.cols || json.grid?.cols || 0);
      const rows = Number(json.rows || json.grid?.rows || 0);

      GameCore.state.map.url  = url;
      GameCore.state.map.tile = tile;
      GameCore.state.map.cols = cols;
      GameCore.state.map.rows = rows;

      // Belegungsraster (optional)
      if (Array.isArray(json.blocks)) {
        GameCore.state.map.grid = json.blocks;
      } else if (json.grid && Array.isArray(json.grid.blocks)) {
        GameCore.state.map.grid = json.grid.blocks;
      } else {
        // default: alles frei
        GameCore.state.map.grid = Array.from({ length: rows }, ()=> Array(cols).fill(0));
      }

      ok('[map] geladen:', url, `(${cols}x${rows}, tile=${tile})`);
      window.dispatchEvent(new CustomEvent('cb:map-ready', { detail:{ url, cols, rows, tile } }));
      return true;
    } catch (e) {
      err('[map] Ladefehler:', e?.message || e);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Ressourcen-API (+ Events fürs HUD/Inspector)
  // ---------------------------------------------------------------------------
  function changeRes(type, delta) {
    const s = GameCore.state.resources;
    const before = s[type] || 0;
    const after  = Math.max(0, before + Number(delta || 0));
    s[type] = after;
    window.dispatchEvent(new CustomEvent('cb:res:change', { detail:{ type, before, after }}));
    ok('[res]', type, before, '→', after);
  }

  GameCore.Resources = {
    add   : (t,a)=> changeRes(t, +a),
    remove: (t,a)=> changeRes(t, -Math.abs(a || 0)),
    get   : (t)=> GameCore.state.resources[t] || 0
  };

  // ---------------------------------------------------------------------------
  // Hindernisprüfungen (Tile-basiert, 1-Tile-Puffer möglich)
  // world → tile
  // ---------------------------------------------------------------------------
  function worldToTile(x, y) {
    const T = GameCore.state.map.tile || 64;
    return { tx: Math.floor(x / T), ty: Math.floor(y / T) };
  }

  function isBlocked(tx, ty) {
    const grid = GameCore.state.map.grid;
    if (!grid || !grid.length) return false;
    if (ty < 0 || tx < 0 || ty >= grid.length || tx >= grid[0].length) return true; // Außen: block
    return !!grid[ty][tx];
  }

  // Prüft Kachel inkl. 1-Tile-Puffer drumherum (für Gebäude 1x1)
  function isOccupiedWithPadding(tx, ty) {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (isBlocked(tx + ox, ty + oy)) return true;
      }
    }
    // zusätzlich: bereits platzierte Gebäude im Weg?
    const T = GameCore.state.map.tile || 64;
    const wx = tx * T, wy = ty * T;
    for (const b of GameCore.state.buildings) {
      if (Math.abs(b.x - wx) <= T && Math.abs(b.y - wy) <= T) return true;
    }
    return false;
  }

  GameCore.Nav = {
    worldToTile,
    isBlocked,
    isOccupiedWithPadding,
  };

  // ---------------------------------------------------------------------------
  // Gebäude-Platzierung + Events vom UI
  // ---------------------------------------------------------------------------
  function snapToGrid(v) {
    const T = GameCore.state.map.tile || 64;
    return Math.round(v / T) * T;
  }

  function cameraCenterWorld() {
    // defensiv, falls noch keine Kamera gebunden
    const cam = window.GameCamera || { x:0, y:0, scale:1 };
    const cvs = document.getElementById('game') || document.querySelector('canvas');
    if (!cvs) return { x: cam.x, y: cam.y };
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const vw  = (cvs.width  / dpr) / (cam.scale || 1);
    const vh  = (cvs.height / dpr) / (cam.scale || 1);
    return { x: cam.x + vw/2, y: cam.y + vh/2 };
  }

  function placeBuilding(kind, wx, wy) {
    if (!kind) return null;
    if (typeof wx !== 'number' || typeof wy !== 'number') {
      const c = cameraCenterWorld();
      wx = c.x; wy = c.y;
    }

    const T  = GameCore.state.map.tile || 64;
    const gx = snapToGrid(wx);
    const gy = snapToGrid(wy);
    const { tx, ty } = worldToTile(gx, gy);

    if (isOccupiedWithPadding(tx, ty)) {
      warn('[build] blockiert @', tx, ty, '(mit Puffer)');
      window.dispatchEvent(new CustomEvent('cb:build:denied', { detail:{ kind, tx, ty }}));
      return null;
    }

    const b = { id: ++_idSeq, kind, x: gx, y: gy, w: T, h: T };
    loadSprite(kind);                     // ggf. Sprite vorladen
    GameCore.state.buildings.push(b);

    ok('[build] platziert:', kind, '→', gx, gy, '(tiles', tx, ty, ')');
    window.dispatchEvent(new CustomEvent('cb:build:placed', { detail: { ...b }}));
    return b;
  }

  // Moderner Build-Event
  window.addEventListener('cb:build:place', (ev) => {
    const d = ev?.detail || {};
    placeBuilding(d.kind, d.x, d.y);
  });

  // Legacy/Fallback aus ui-build.js (place-xyz)
  window.addEventListener('cb:build-action', (ev) => {
    const act = ev?.detail?.action || '';
    if (act.startsWith('place-')) {
      placeBuilding(act.replace('place-', ''));
    }
  });

  // ---------------------------------------------------------------------------
  // Zeichnen der Entities (vom Renderer aufgerufen)
  // ---------------------------------------------------------------------------
  window.drawEntities = function drawEntities(ctx) {
    const list = GameCore.state.buildings;
    if (!list || !list.length) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind) || loadSprite(b.kind);
      if (spr && spr !== 'error' && spr.complete) {
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter (sichtbar, bis Sprite geladen ist)
        ctx.save();
        ctx.fillStyle = 'rgba(255,185,0,0.9)'; // gold
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui,sans-serif';
        ctx.fillText(b.kind, b.x + 6, b.y + b.h/2 + 4);
        ctx.restore();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Engine/Loop
  // ---------------------------------------------------------------------------
  function _tick(t) {
    if (!GameCore.state.running) return;
    if (!_last) _last = t;
    const dt = Math.min(48, Math.max(8, t - _last)); // clamp
    _last = t;
    GameCore.state.time += dt;
    GameCore.state.dt = dt;

    // (hier später: Units bewegen, Produktionen, Pfade etc.)

    _raf = requestAnimationFrame(_tick);
  }

  async function init(mapUrl) {
    // Mapquelle bestimmen
    let url = mapUrl;
    if (!url) {
      const cvs = document.getElementById('game');
      url = cvs?.dataset?.map || 'assets/maps/map-mini.json';
    }
    GameCore.state.map.url = url;

    // Map laden
    await loadMap(url);
    ok('init done');
  }

  async function start(mapUrl) {
    if (GameCore.state.running) return;
    await init(mapUrl);
    GameCore.state.running = true;
    _last = 0;
    cancelAnimationFrame(_raf);
    _raf = requestAnimationFrame(_tick);
    ok('start');
  }

  function stop() {
    GameCore.state.running = false;
    cancelAnimationFrame(_raf);
    ok('stop');
  }

  GameCore.Engine = { init, start, stop };

  // ---------------------------------------------------------------------------
  // Öffentliche Kurz-APIs (bequem für Inspector/Tests)
  // ---------------------------------------------------------------------------
  GameCore.place = placeBuilding;      // GameCore.place('farm', x, y)
  GameCore.addRes = (t,a)=> changeRes(t, +a);
  GameCore.subRes = (t,a)=> changeRes(t, -Math.abs(a||0));

  // Telemetrie
  ok('Modul geladen', GameCore.state.version);
})();
