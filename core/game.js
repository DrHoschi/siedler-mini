/* ============================================================================
 * core/game.js — v18.0.0
 * Neue Siedler – GameCore (Engine-Light) + Gebäude-Bridge (integrated)
 *
 * Ziele:
 *  - Stellt GameCore bereit (State, Entities, Events, API)
 *  - Verarbeitet Bau-Events (modern + legacy)
 *  - Definiert window.drawEntities(ctx) für core.render.js
 *  - Kompatibel zur Legacy-Fassade (root game.js → "Legacy-Patch übersprungen")
 * ========================================================================== */

(() => {
  'use strict';

  // ---------- Logging ------------------------------------------------------
  const L = (t, ...a) => (window.CBLog?.info || console.log)(t, ...a);
  const O = (t, ...a) => (window.CBLog?.ok   || console.log)(t, ...a);
  const W = (t, ...a) => (window.CBLog?.warn || console.warn)(t, ...a);
  const E = (t, ...a) => (window.CBLog?.err  || console.error)(t, ...a);
  const TAG = '[GameCore]';

  // ---------- Namespace ----------------------------------------------------
  const GameCore = (window.GameCore = window.GameCore || {});
  const Game     = (window.Game     = window.Game     || {}); // Legacy-API passthrough

  // ---------- Konstante / Defaults ----------------------------------------
  const TILE_SIZE = 64; // muss zum Terrain-Tileset passen
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  // Kinds → Sprites (an deine Dateistruktur angepasst)
  // Wenn ein Eintrag fehlt, wird ein Platzhalter gezeichnet.
  const SPRITE_MAP = {
    hq:           'assets/tex/building/wood/hq_wood.PNG',
    house:        'assets/tex/building/wood/Wohnhaus_wood1_ug0.png',
    depot:        'assets/tex/building/wood/depot_wood.png',
    fisher:       'assets/tex/building/wood/fischer_wood1.PNG',
    farm:         'assets/tex/building/wood/farm_wood.png',
    windmill:     'assets/tex/building/wood/windmuehle_wood.PNG',
    lumberjack:   'assets/tex/building/wood/lumberjack_wood.PNG',
    stonecutter:  'assets/tex/building/wood/steinmetz_wood.png',
    smith:        'assets/tex/building/wood/Schmied_wood0.png',
    guardtower:   'assets/tex/building/wood/wachturm _wood.png', // (Leerzeichen bestätigt)
  };

  // Aktionen, die KEIN Gebäude erzeugen (Maler/Wege etc.) – werden ignoriert
  const NON_BUILD_ACTIONS = new Set([
    'road', 'road-curve', 'road-cross',
    'grass', 'meadow', 'rock', 'sand', 'water',
    'paint-grass', 'paint-meadow', 'paint-rock', 'paint-sand', 'paint-water'
  ]);

  // ---------- State --------------------------------------------------------
  const STATE = (GameCore.state = GameCore.state || {
    map: {
      url:  '',      // aktuelle Map-URL (informativ)
      tile: TILE_SIZE
    },
    entities: {
      buildings: []  // [{id, kind, x, y, w, h, sprite?}]
    },
    _seq: 0
  });

  // ---------- Sprite-Cache -------------------------------------------------
  const SPRITES = new Map(); // kind -> HTMLImageElement | 'error'

  function getSprite(kind) {
    // Cache hit
    if (SPRITES.has(kind)) return SPRITES.get(kind);

    const src = SPRITE_MAP[kind];
    if (!src) {
      SPRITES.set(kind, 'error');
      W(`${TAG} Sprite-Pfad fehlt für kind="${kind}"`);
      return 'error';
    }

    const img = new Image();
    img.onload  = () => O(`${TAG} Sprite geladen: ${kind}`);
    img.onerror = () => {
      SPRITES.set(kind, 'error');
      W(`${TAG} Sprite nicht gefunden: ${kind} (${src})`);
    };
    img.src = src;
    SPRITES.set(kind, img);
    return img;
  }

  // ---------- Hilfsfunktionen ---------------------------------------------
  const snapToGrid = v => Math.round(v / TILE_SIZE) * TILE_SIZE;

  function cameraCenterWorld() {
    const cam = window.GameCamera;
    const cvs = document.getElementById('game') || document.querySelector('canvas');
    if (!cam || !cvs) return { x: 0, y: 0 };

    const scale = cam.scale || 1;
    const w = (cvs.width  / DPR) / scale;
    const h = (cvs.height / DPR) / scale;

    return { x: cam.x + w / 2, y: cam.y + h / 2 };
  }

  // ---------- Gebäude-API --------------------------------------------------
  function placeBuilding(kind, x, y) {
    if (!kind) return null;

    // Actions, die kein Gebäude sind, überspringen
    if (NON_BUILD_ACTIONS.has(kind)) {
      L(`${TAG} paint/road-Aktion ignoriert: ${kind}`);
      return null;
    }

    // Koordinate aus Kamera-Mitte, falls nicht übergeben
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }

    const b = {
      id: ++STATE._seq,
      kind,
      x: snapToGrid(x),
      y: snapToGrid(y),
      w: TILE_SIZE,
      h: TILE_SIZE
    };

    // Sprite (lazy load)
    getSprite(kind);

    STATE.entities.buildings.push(b);
    O(`${TAG} platziert: ${kind} → ${b.x} ${b.y} (gesamt: ${STATE.entities.buildings.length})`);
    return b;
  }

  function clearBuildings() {
    STATE.entities.buildings.length = 0;
    STATE._seq = 0;
    L(`${TAG} Gebäude zurückgesetzt.`);
  }

  // ---------- Event-Wiring (UI-Bau) ---------------------------------------
  // Moderner Weg (empfohlen):
  //   window.dispatchEvent(new CustomEvent('cb:build:place', { detail:{ kind, x, y } }))
  window.addEventListener('cb:build:place', ev => {
    try {
      const d = ev?.detail || {};
      if (!d.kind) return;
      placeBuilding(d.kind, d.x, d.y);
    } catch (e) {
      E(`${TAG} cb:build:place Fehler:`, e);
    }
  });

  // Legacy Weg (kompatibel):
  //   window.dispatchEvent(new CustomEvent('build:action', { detail:{ action:'place-xyz' } }))
  window.addEventListener('build:action', ev => {
    try {
      const act = String(ev?.detail?.action || '');
      if (!act.startsWith('place-')) return;

      const kind = act.slice('place-'.length);
      placeBuilding(kind);
    } catch (e) {
      E(`${TAG} build:action Fehler:`, e);
    }
  });

  // ---------- Render-Hook --------------------------------------------------
  // Wird von assets/core/core.render.js einmal pro Frame aufgerufen (falls vorhanden)
  window.drawEntities = function drawEntities(ctx) {
    const list = STATE.entities.buildings;
    if (!list || !list.length) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind) || getSprite(b.kind);

      if (spr && spr !== 'error' && spr.complete) {
        // echtes Sprite
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter
        ctx.save();
        ctx.fillStyle = 'rgba(255,185,0,0.85)';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText(b.kind, b.x + 6, b.y + b.h / 2 + 4);
        ctx.restore();
      }
    }
  };

  // ---------- Engine-API ---------------------------------------------------
  GameCore.Engine = GameCore.Engine || {};

  GameCore.Engine.start = async function start(mapUrl) {
    try {
      STATE.map.url = mapUrl || (document.getElementById('game')?.dataset?.map) || '';
      STATE.map.tile = TILE_SIZE;
      O(`${TAG} Engine.start → map: ${STATE.map.url || '(unbekannt)'}`);
      // Map-Loading und Render-Loop werden in deinen bestehenden Modulen erledigt.
      // Hier nur State vorbereiten.
      return true;
    } catch (e) {
      E(`${TAG} Engine.start Fehler:`, e);
      return false;
    }
  };

  GameCore.Engine.reset = function reset() {
    clearBuildings();
    O(`${TAG} Engine.reset`);
  };

  // ---------- Legacy-Kompatibilität ---------------------------------------
  // Ein paar Convenience-Weiterleitungen auf window.Game:
  Game.state  = STATE;
  Game.place  = (kind, x, y) => placeBuilding(kind, x, y);
  Game.clear  = () => clearBuildings();

  O('[GameCore] Modul geladen env:' + (window.__cb?.env || 'n/a'));
})();
