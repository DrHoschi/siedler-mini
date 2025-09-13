/* ============================================================================
 * Neue Siedler – Core Engine + Gebäude-Bridge
 * Datei: assets/core/game.js
 * Version: v17.9.8
 *
 * Liefert:
 *   - window.GameCore.Engine.start(mapUrl?)
 *   - window.GameCore.Engine.stop()
 *   - window.Game.state (sichtbarer Readonly-State)
 *   - window.Game.place(kind, x?, y?)  → manuelles Platzieren
 *   - window.drawEntities(ctx)         → vom Renderer aufgerufen
 *
 * Features:
 *   - Default-HQ beim Start in Kartenmitte
 *   - Events: cb:build:place / build:action / cb:build-action
 *   - Sprite-Loader (assets/buildings/<name>.png), Platzhalter nach Kategorie
 *   - Kategoriale Farben (NICHT Rot/Grün; die bleiben für Platzier-OK/Blockiert)
 * ============================================================================ */

(() => {
  'use strict';

  // -----------------------------------------------------------------------
  // Logging helpers
  // -----------------------------------------------------------------------
  const L = {
    info : (...a)=> (window.CBLog?.info  || console.log)('[GameCore]', ...a),
    ok   : (...a)=> (window.CBLog?.ok    || console.log)('[GameCore]', ...a),
    warn : (...a)=> (window.CBLog?.warn  || console.warn)('[GameCore]', ...a),
    err  : (...a)=> (window.CBLog?.error || console.error)('[GameCore]', ...a),
  };

  // Mehrfach-Init verhindern
  if (window.GameCore?.Engine) {
    L.warn('bereits initialisiert – skip Engine-Init (Bridge ist aktiv).');
    // drawEntities könnte vom alten Build fehlen → aber wir greifen nicht ein
    return;
  }

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const GameCore = (window.GameCore = window.GameCore || {});
  const state = (GameCore.state = GameCore.state || {
    version: '17.9.8',
    map: {
      tile: 64,
      cols: 16,
      rows: 16,
      url : null,
      data: null,
    },
    entities: {
      buildings: [],       // {id, kind, x, y, w, h, cat}
      _idseq   : 0,
    },
    ui: { started: false }
  });

  // -----------------------------------------------------------------------
  // Util
  // -----------------------------------------------------------------------
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  function getCanvas() {
    return (
      document.getElementById('game') ||
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
    const w = (cvs.width  / DPR) / (cam.scale || cam.zoom || 1);
    const h = (cvs.height / DPR) / (cam.scale || cam.zoom || 1);
    return { x: (cam.x || 0) + w/2, y: (cam.y || 0) + h/2 };
  }

  function mapCenterWorld() {
    const t = state.map.tile || 64;
    const cx = Math.floor((state.map.cols || 16) * t / 2);
    const cy = Math.floor((state.map.rows || 16) * t / 2);
    return { x: cx, y: cy };
  }

  // -----------------------------------------------------------------------
  // Kategorie-Zuordnung & Farben (Platzhalter)
  //   Hinweis: Rot/Grün NICHT genutzt – reserviert für Platzierbar/Blockiert.
  // -----------------------------------------------------------------------
  const CATEGORY_COLORS = {
    // Verwaltungs-/Allgemein
    admin:    '#FFB703', // warmes Gelb
    // Nahrung/Produktion
    food:     '#E9C46A', // sand
    // Rohstoffe
    resource: '#2A9D8F', // teal
    // Wohnen
    home:     '#F4A261', // orange
    // Infrastruktur/Wege
    infra:    '#457B9D', // blau
    // Militär
    military: '#8D99AE', // graublau
    // Fallback
    default:  '#BDBDBD'
  };

  // "kind" → Kategorie
  const KIND_TO_CATEGORY = {
    hq: 'admin',
    rathaus: 'admin',
    depot: 'admin',

    fisher: 'food',
    farm: 'food',
    windmill: 'food',

    lumberjack: 'resource',
    stonecutter: 'resource',
    smith: 'resource',

    house: 'home',
    wohnhaus: 'home',

    road: 'infra',
    'road-curve': 'infra',
    'road-cross': 'infra',

    guardtower: 'military',
    wachturm: 'military',
  };

  function categoryOf(kind) {
    return KIND_TO_CATEGORY[kind] || 'default';
  }

  function colorOf(kind) {
    return CATEGORY_COLORS[categoryOf(kind)] || CATEGORY_COLORS.default;
  }

  // -----------------------------------------------------------------------
  // Sprite-Auflösung & Loader
  // -----------------------------------------------------------------------
  const SPRITES = new Map(); // kind → HTMLImageElement | 'error'

  // Namensnormalisierung: aus "place-hq" → "hq"
  function normalizeKind(name) {
    if (!name) return '';
    let k = String(name).trim().toLowerCase();
    if (k.startsWith('place-')) k = k.slice(6);
    // ein paar Aliase für deine Dateinamen:
    if (k === 'guardtower') k = 'wachturm';
    if (k === 'stonecutter') k = 'steinmetz';
    return k;
  }

  // Mapping: kind → Dateipfad
  function resolveSpritePath(kind) {
    const k = normalizeKind(kind);

    // Priorität 1: neue, von dir bereits verschobene Dateien
    const preferred = {
      hq:           'assets/buildings/rathaus_wood1.png',  // später evtl. Stufenwahl
      rathaus:      'assets/buildings/rathaus_wood1.png',
      house:        'assets/buildings/wohnhaus_wood0_ug0.png',
      wohnhaus:     'assets/buildings/wohnhaus_wood0_ug0.png',
      depot:        'assets/buildings/depot_wood.png',
      fisher:       'assets/buildings/fischer_wood1.png',
      farm:         'assets/buildings/farm_wood.png',
      lumberjack:   'assets/buildings/lumberjack_wood.png',
      smith:        'assets/buildings/schmied_wood0.png',
      steinmetz:    'assets/buildings/steinmetz_wood.png',
      wachturm:     'assets/buildings/wachturm_wood.png',
      windmill:     'assets/buildings/windmuehle_wood.png',
    };
    if (preferred[k]) return preferred[k];

    // Priorität 2: generisch (falls du weitere Kinds später anlegst)
    return `assets/buildings/${k}.png`;
  }

  function loadSprite(kind) {
    const k = normalizeKind(kind);
    if (SPRITES.has(k)) return SPRITES.get(k);

    const path = resolveSpritePath(k);
    const img  = new Image();
    img.onload  = () => L.ok('Sprite geladen:', k);
    img.onerror = () => { SPRITES.set(k, 'error'); L.warn('Sprite fehlt:', k, '→', path); };
    img.src     = path;

    SPRITES.set(k, img);
    return img;
  }

  // -----------------------------------------------------------------------
  // Platzieren & Zeichnen
  // -----------------------------------------------------------------------
  function placeBuilding(kind, x, y) {
    const k = normalizeKind(kind);
    if (!k) return null;

    // Standard: zentriert auf Kameramitte, falls nichts angegeben
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }

    const t = state.map.tile || 64;
    const b = {
      id: ++state.entities._idseq,
      kind: k,
      cat:  categoryOf(k),
      x : snapToGrid(x),
      y : snapToGrid(y),
      w : t,
      h : t,
    };

    loadSprite(k); // async anstoßen
    state.entities.buildings.push(b);
    L.info('Gebäude platziert:', k, '→', b.x, b.y, '(gesamt:', state.entities.buildings.length, ')');
    return b;
  }

  // Zeichnen für den Renderer
  window.drawEntities = function drawEntities(ctx) {
    const list = state.entities.buildings;
    if (!list || list.length === 0) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind) || loadSprite(b.kind);

      if (spr && spr !== 'error' && spr.complete) {
        // Normales Sprite
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter in Kategorienfarbe
        ctx.save();
        ctx.fillStyle   = colorOf(b.kind);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth   = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.fillStyle   = '#111';
        ctx.font        = '12px system-ui, sans-serif';
        ctx.fillText(b.kind, b.x + 6, b.y + b.h/2 + 4);
        ctx.restore();
      }
    }
  };

  // -----------------------------------------------------------------------
  // Map laden / Start
  // -----------------------------------------------------------------------
  async function loadMapFromCanvasOr(urlFromStart) {
    // Reihenfolge: explizites start(mapUrl) → canvas[data-map] → Default
    const cvs = getCanvas();
    const url = urlFromStart || cvs?.getAttribute('data-map') || 'assets/maps/map-mini.json';
    state.map.url = url;

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      state.map.data = json;

      // Meta übernehmen, falls vorhanden
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

    await loadMapFromCanvasOr(mapUrl);

    // Default-HQ einmalig in Kartenmitte setzen
    const c = mapCenterWorld();
    placeBuilding('hq', c.x, c.y);

    L.info('Engine ready. (v' + state.version + ')');
  }

  function stop() {
    state.ui.started = false;
    L.warn('Engine gestoppt.');
  }

  // -----------------------------------------------------------------------
  // UI-Events (Build)
  // -----------------------------------------------------------------------
  function onBuildPlace(ev) {
    const d = ev?.detail || {};
    if (!d?.kind) return;
    placeBuilding(d.kind, d.x, d.y);
  }

  function onBuildAction(ev) {
    const d = ev?.detail || {};
    const act = (d.action || '').toLowerCase();
    if (!act.startsWith('place-')) return;
    const kind = act.slice('place-'.length);
    placeBuilding(kind);
  }

  // nur einmal binden
  (function bindBuildEventsOnce(){
    if (window.__cb_build_events_bound__) return;
    window.__cb_build_events_bound__ = true;
    window.addEventListener('cb:build:place',  onBuildPlace);
    window.addEventListener('build:action',    onBuildAction);
    window.addEventListener('cb:build-action', onBuildAction);
    L.info('Build-Events gebunden.');
  })();

  // -----------------------------------------------------------------------
  // Öffentliche API
  // -----------------------------------------------------------------------
  GameCore.Engine = { start, stop };
  const Game = (window.Game = window.Game || {});
  Game.state = GameCore.state;
  Game.place = placeBuilding;

  // Hinweis: Dein ui-start dispatcht bereits "cb:game-start".
  // Wir starten beim Event, damit der Renderer/Assets bereit sind.
  window.addEventListener('cb:game-start', () => start());

  L.info('Modul geladen env:' + (window.__ENV_VERSION__ || 'unknown'));
})();
