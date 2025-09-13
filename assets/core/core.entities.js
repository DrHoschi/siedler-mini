/* ============================================================================
 * Datei: assets/core/core.entities.js
 * Version: v17.6.0
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Zentrale Entity-/Gebäude-Verwaltung (Platzierung, Render, Sprites)
 *  - Auto-Spawn "Rathaus" beim Spielstart (Kartenmitte)
 *  - Platzhalter-Rendering in Kategorie-Farben (kein Rot/Grün!)
 *  - Einheitlicher drawEntities(ctx) für den Renderer
 *
 * Abhängigkeiten (optional):
 *  - window.GameCore?.state.map   → { tile, cols, rows } (falls vorhanden)
 *  - window.GameCamera            → { x, y, zoom } für World<->Screen
 *  - assets/core/core.render.js   → ruft window.drawEntities(ctx) auf
 * ========================================================================== */
(function () {
  'use strict';

  const TAG  = '[entities]';
  const L = {
    info : (...a) => (window.CBLog?.info  || console.log)(TAG, ...a),
    ok   : (...a) => (window.CBLog?.ok    || console.log)(TAG, ...a),
    warn : (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a),
    err  : (...a) => (window.CBLog?.error || console.error)(TAG, ...a),
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  const State = {
    list: /** @type {Array<{id:number, kind:string, x:number, y:number, w:number, h:number}>} */([]),
    seq: 0,
    autoSpawned: false,
    tile: 64,           // wird ggf. aus GameCore überschrieben
  };

  // Aktualisiere Tilegröße aus GameCore, wenn verfügbar
  try {
    const t = window.GameCore?.state?.map?.tile;
    if (typeof t === 'number' && t > 0) State.tile = t;
  } catch (_) {}

  // ---------------------------------------------------------------------------
  // Kategorien & Farben (Platzhalter)
  // (bewusst KEIN reines Rot/Grün – reserviert für "platzierbar"/"blockiert")
  // ---------------------------------------------------------------------------
  const CATEGORY_COLORS = {
    verwaltung   : '#6C5CE7', // violett/blau
    nahrung      : '#F1C40F', // gelb/amber
    rohstoffe    : '#1ABC9C', // türkis (nicht rein-grün)
    wohnen       : '#8E44AD', // violett
    infrastruktur: '#3498DB', // blau
    deko         : '#95A5A6', // grau
    militaer     : '#E67E22', // orange
    default      : '#BDC3C7', // neutral
  };

  /** Mapping: kind → Kategorie */
  const KIND_CATEGORY = {
    // Verwaltung
    rathaus: 'verwaltung',
    // Nahrung
    farm: 'nahrung',
    fisher: 'nahrung', fischer: 'nahrung',
    // Rohstoffe
    lumberjack: 'rohstoffe',
    stonecutter: 'rohstoffe', steinmetz: 'rohstoffe',
    smith: 'rohstoffe', schmied: 'rohstoffe',
    // Wohnen
    house: 'wohnen', wohnhaus: 'wohnen',
    // Infrastruktur
    road: 'infrastruktur', 'road-curve': 'infrastruktur', 'road-cross': 'infrastruktur',
    // Deko
    grass: 'deko', meadow: 'deko', rock: 'deko', sand: 'deko', water: 'deko',
    // Militär
    guardtower: 'militaer', wachturm: 'militaer', hq: 'militaer',
  };

  function colorForKind(kind) {
    const cat = KIND_CATEGORY[kind] || 'default';
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;
  }

  // ---------------------------------------------------------------------------
  // Sprite-Lader
  //  - Versucht mehrere plausible Pfade + Aliasnamen
  //  - Fällt auf Platzhalter zurück, wenn nichts gefunden
  // ---------------------------------------------------------------------------
  const SPRITE_CACHE = new Map();      // key → HTMLImageElement | 'error'
  const PENDING = new Set();           // lädt bereits

  const KIND_ALIAS = {
    house: 'wohnhaus_wood0_ug0',
    rathaus: 'rathaus_wood1',
    depot: 'depot_wood',
    farm: 'farm_wood',
    fisher: 'fischer_wood1', fischer: 'fischer_wood1',
    lumberjack: 'lumberjack_wood',
    stonecutter: 'steinmetz_wood', steinmetz: 'steinmetz_wood',
    smith: 'schmied_wood0', schmied: 'schmied_wood0',
    windmill: 'windmuehle_wood', windmuehle: 'windmuehle_wood',
    guardtower: 'wachturm_wood', wachturm: 'wachturm_wood',
    hq: 'hq_wood', // Hinweis: ggf. liegt es unter assets/tex/building/wood/hq_wood.PNG
  };

  const PATH_CANDIDATES = [
    (n) => `assets/buildings/${n}.png`,
    (n) => `assets/buildings/${n}.PNG`,
    (n) => `assets/tex/building/wood/${n}.png`,
    (n) => `assets/tex/building/wood/${n}.PNG`,
    (n) => `assets/${n}.png`, // z.B. hq_stone.png im Root-Assets
    (n) => `assets/${n}.PNG`,
  ];

  function resolveName(kind) {
    return KIND_ALIAS[kind] || kind;
    // z.B. kind "house" → "wohnhaus_wood0_ug0"
  }

  function tryLoadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('load-error'));
      img.src = url;
    });
  }

  async function loadSprite(kind) {
    const key = `spr:${kind}`;
    if (SPRITE_CACHE.has(key)) return SPRITE_CACHE.get(key);
    if (PENDING.has(key)) return null; // schon unterwegs

    PENDING.add(key);

    const base = resolveName(kind);
    for (const mk of PATH_CANDIDATES) {
      const url = mk(base);
      try {
        const img = await tryLoadImage(url);
        SPRITE_CACHE.set(key, img);
        PENDING.delete(key);
        L.ok('Sprite geladen:', kind, '←', url);
        return img;
      } catch {
        // weiter probieren
      }
    }

    SPRITE_CACHE.set(key, 'error');
    PENDING.delete(key);
    L.warn('Sprite fehlt:', kind, '(versuchte Aliase:', base, ')');
    return null;
  }

  function getSpriteSync(kind) {
    const key = `spr:${kind}`;
    const got = SPRITE_CACHE.get(key);
    return got && got !== 'error' && got.complete ? got : null;
  }

  // ---------------------------------------------------------------------------
  // World/Map Hilfen
  // ---------------------------------------------------------------------------
  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('game-canvas') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function getCamera() {
    const cam = window.GameCamera || {};
    return {
      x: +cam.x || 0,
      y: +cam.y || 0,
      zoom: cam.zoom > 0 ? +cam.zoom : 1,
    };
  }

  function snapToGrid(v) {
    return Math.round(v / State.tile) * State.tile;
  }

  /** Bestmögliche Kartenmitte (Map-Meta bevorzugt, sonst Canvas/Zoom) */
  function mapCenterWorld() {
    try {
      const m = window.GameCore?.state?.map;
      if (m?.cols && m?.rows && m?.tile) {
        const cx = (m.cols * m.tile) / 2;
        const cy = (m.rows * m.tile) / 2;
        return { x: cx, y: cy };
      }
    } catch (_) {}

    const cvs = getCanvas();
    const cam = getCamera();
    if (cvs) {
      const w = (cvs.width / DPR) / cam.zoom;
      const h = (cvs.height / DPR) / cam.zoom;
      return { x: cam.x + w / 2, y: cam.y + h / 2 };
    }
    // Fallback 16x16 Tiles
    return { x: 8 * State.tile, y: 8 * State.tile };
  }

  // ---------------------------------------------------------------------------
  // API: Platzieren / Entfernen / Abfragen
  // ---------------------------------------------------------------------------
  function place(kind, x, y, size = State.tile) {
    if (!kind) return null;
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = mapCenterWorld();
      x = c.x; y = c.y;
    }
    const b = {
      id: ++State.seq,
      kind: String(kind),
      x: snapToGrid(x),
      y: snapToGrid(y),
      w: size,
      h: size,
    };
    // Sprite-Ladung anstoßen (async)
    void loadSprite(b.kind);
    State.list.push(b);
    L.info('platziert:', b.kind, '→', b.x, b.y, '(gesamt:', State.list.length, ')');
    return b;
  }

  function remove(id) {
    const idx = State.list.findIndex(b => b.id === id);
    if (idx >= 0) State.list.splice(idx, 1);
  }

  function clear() {
    State.list.length = 0;
  }

  function list() {
    return State.list.slice();
  }

  // ---------------------------------------------------------------------------
  // Auto-Spawn: Rathaus einmalig beim Spielstart in Kartenmitte
  // ---------------------------------------------------------------------------
  function autoSpawnTownHallOnce() {
    if (State.autoSpawned) return;
    State.autoSpawned = true;

    const { x, y } = mapCenterWorld();
    // leichte Justierung auf Grid
    const gx = snapToGrid(x);
    const gy = snapToGrid(y);
    place('rathaus', gx, gy);
    L.ok('Rathaus automatisch platziert (Kartenmitte):', gx, gy);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  // Modern: exakte Koordinaten können mitgegeben werden
  window.addEventListener('cb:build:place', (ev) => {
    const d = ev?.detail || {};
    place(d.kind, d.x, d.y);
  });

  // Legacy: "place-xxx" ohne Koordinaten -> Kamera-Mitte
  function onLegacyBuild(ev) {
    const d = ev?.detail || {};
    const action = d.action || '';
    if (!action.startsWith('place-')) return;
    const kind = action.slice('place-'.length);
    place(kind);
  }
  window.addEventListener('cb:build-action', onLegacyBuild);
  window.addEventListener('build:action', onLegacyBuild);

  // Spielstart → Auto-Spawn Rathaus
  window.addEventListener('cb:game-start', () => {
    // ggf. Tilegröße aus GameCore frisch holen
    try {
      const t = window.GameCore?.state?.map?.tile;
      if (typeof t === 'number' && t > 0) State.tile = t;
    } catch (_) {}
    autoSpawnTownHallOnce();
  });

  // ---------------------------------------------------------------------------
  // Rendering-Hook (vom Renderer aufgerufen)
  // ---------------------------------------------------------------------------
  function drawPlaceholder(ctx, b) {
    // Kategorie-Farbe (ohne Rot/Grün)
    const base = colorForKind(b.kind);
    // Halbdurchsichtige Füllung + dunkler Rand
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle   = base;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.globalAlpha = 1;
    ctx.lineWidth   = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);

    // Label
    ctx.font = '12px system-ui, Segoe UI, Roboto, Arial';
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillText(b.kind, b.x + 6, b.y + b.h / 2 + 4);
    ctx.restore();
  }

  /** Diese Funktion wird von core.render.js in jedem Frame aufgerufen. */
  window.drawEntities = function drawEntities(ctx) {
    if (!ctx || !State.list.length) return;

    for (const b of State.list) {
      const spr = getSpriteSync(b.kind);
      if (spr) {
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        drawPlaceholder(ctx, b);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Öffentliche API
  // ---------------------------------------------------------------------------
  window.GameEntities = {
    place, remove, clear, list,
    _state: State, // debug only
  };

  L.info('Modul geladen (v17.6.0).');
})();
