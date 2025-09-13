/* ============================================================================
 * Datei: assets/core/core.entities.js
 * Version: v17.6.0
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Entity-/Gebäude-Management (State + Platzierung)
 *  - Platzhalter-Renderlogik mit Kategorienfarben
 *  - Optionales Laden & Zeichnen von Sprites (falls vorhanden)
 *  - Auto-Spawn eines Rathauses (hq) in der Mapmitte beim Start
 *
 * Abhängigkeiten (optional/freundlich):
 *  - window.GameCore?.state.map  (tile/cols/rows)
 *  - window.GameCamera           (x,y,scale) – nur für Komfortfunktionen
 *  - core.render ruft window.drawEntities(ctx) auf
 *
 * Events (Eingang):
 *  - cb:game-start
 *  - cb:build:place {kind,x?,y?}
 *  - cb:build-action {action:'place-<kind>'}
 *
 * Globale API:
 *  - window.GameEntities.place(kind, x?, y?)            → platziert auf Grid
 *  - window.drawEntities(ctx)                           → Renderer-Hook
 *  - window.Game.state.entities.buildings (Quelle)
 * ========================================================================== */
(function(){
  'use strict';

  // ---------- Logging ------------------------------------------------------
  const TAG = '[entities]';
  const L = {
    info : (...a)=> (window.CBLog?.info  || console.log)(TAG, ...a),
    ok   : (...a)=> (window.CBLog?.ok    || console.log)(TAG, ...a),
    warn : (...a)=> (window.CBLog?.warn  || console.warn)(TAG, ...a),
    err  : (...a)=> (window.CBLog?.error || console.error)(TAG, ...a),
  };

  // Doppel-Init vermeiden
  if (window.GameEntities?.__v === '17.6.0') {
    L.warn('bereits initialisiert – skip');
    return;
  }

  // ---------- State/Backbone ----------------------------------------------
  const GameCore = (window.GameCore = window.GameCore || {});
  const GSTATE   = (GameCore.state = GameCore.state || {});
  const mapState = (GSTATE.map = GSTATE.map || { tile:64, cols:16, rows:10 });

  const DPR = Math.max(1, window.devicePixelRatio || 1);

  const EntitiesState = (GSTATE.entities = GSTATE.entities || {
    buildings: [],
    _idseq   : 0
  });

  // Für Inspector/Komfort:
  const Game = (window.Game = window.Game || {});
  Game.state = GameCore.state;

  // ---------- Kategorien & Farben -----------------------------------------
  // Achtung: Diese Farben sind NICHT Rot/Grün (die brauchst du für "platzierbar")
  // Passe die Zuordnung später gerne in build.categories.js o.ä. zentral an.
  const CATEGORY_COLORS = {
    'admin'     : '#4B6CB7', // Verwaltung / Rathaus
    'housing'   : '#7F8C8D', // Wohnen
    'food'      : '#B9770E', // Nahrung/Produktion
    'resource'  : '#27AE60', // Rohstoffe
    'infra'     : '#8E44AD', // Straßen/Infra
    'military'  : '#C0392B', // Militär
    'default'   : '#B3B6B7'  // Fallback
  };

  // Simple Heuristik: leite Kategorie aus kind ab (bis echte Datenstruktur kommt)
  function inferCategory(kind='') {
    const k = String(kind).toLowerCase();
    if (k.includes('hq') || k.includes('rathaus')) return 'admin';
    if (k.includes('house') || k.includes('wohn'))  return 'housing';
    if (k.includes('farm') || k.includes('fisch'))  return 'food';
    if (k.includes('lumber') || k.includes('wood') || k.includes('stein') || k.includes('stone'))
      return 'resource';
    if (k.includes('road') || k.includes('path'))   return 'infra';
    if (k.includes('wacht') || k.includes('tower') || k.includes('guard')) return 'military';
    return 'default';
  }

  function colorForKind(kind) {
    const cat = inferCategory(kind);
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;
  }

  // ---------- Utils --------------------------------------------------------
  function tileSize(){ return mapState.tile || 64; }

  function snapToGrid(v) {
    const t = tileSize();
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
    const cam = window.GameCamera || {};
    const cvs = getCanvas();
    if (!cvs) return { x: 0, y: 0 };
    const w = (cvs.width  / DPR) / (cam.scale || 1 || 1);
    const h = (cvs.height / DPR) / (cam.scale || 1 || 1);
    const cx = (cam.x || 0) + w/2;
    const cy = (cam.y || 0) + h/2;
    return { x: cx, y: cy };
  }

  function mapCenterWorld() {
    const t = tileSize();
    const cols = mapState.cols || 16;
    const rows = mapState.rows || 10;
    // Mitte der Map in Weltkoordinaten (linksbündige Tiles → +0.5 für Zentrum)
    return { x: Math.floor(cols/2) * t, y: Math.floor(rows/2) * t };
  }

  // ---------- Sprite-Loader (optional) ------------------------------------
  const SPRITE_BASE = 'assets/buildings';     // erwartet <kind>.png
  const SPRITES = new Map();                  // kind -> Image | 'error'

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
  function place(kind, x, y) {
    if (!kind) return null;

    // Falls Koordinaten fehlen → Kamera-Mitte
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }

    const t = tileSize();
    const b = {
      id: ++EntitiesState._idseq,
      kind,
      x: snapToGrid(x),
      y: snapToGrid(y),
      w: t,
      h: t
    };

    // Sprite optional anstoßen
    loadSprite(kind);

    EntitiesState.buildings.push(b);
    L.info('platziert:', kind, '→', b.x, b.y, '(gesamt:', EntitiesState.buildings.length, ')');
    return b;
  }

  // ---------- Auto-Spawn HQ ------------------------------------------------
  function ensureHQ() {
    const hasHQ = EntitiesState.buildings.some(b => b.kind === 'hq' || b.kind === 'rathaus');
    if (hasHQ) return;
    const c = mapCenterWorld();
    place('hq', c.x, c.y);
    L.ok('Auto-Spawn HQ @ Mapmitte:', c.x, c.y);
  }

  // ---------- Build-Events binden -----------------------------------------
  function onBuildPlace(ev) {
    const d = ev?.detail || {};
    place(d.kind, d.x, d.y);
  }
  function onBuildAction(ev) {
    const d = ev?.detail || {};
    const act = d.action || '';
    if (!act.startsWith('place-')) return;
    const kind = act.slice('place-'.length);
    place(kind);
  }

  window.addEventListener('cb:build:place',  onBuildPlace);
  window.addEventListener('build:action',    onBuildAction);
  window.addEventListener('cb:build-action', onBuildAction);

  // Beim Spielstart HQ sichern (einmalig, nach Map-Load)
  let didStartHook = false;
  window.addEventListener('cb:game-start', () => {
    if (didStartHook) return;
    didStartHook = true;
    // Versuche Map-Meta aus DOM/State nachzureichen (falls noch leer)
    try {
      const cvs = getCanvas();
      const url = cvs?.getAttribute('data-map');
      if (url && !mapState.url) mapState.url = url;
    } catch(_) {}
    // HQ setzen
    ensureHQ();
  });

  // ---------- Zeichnen -----------------------------------------------------
  // Hinweis: Bitte NICHT in jedem Frame loggen (würde spam erzeugen).
  function drawPlaceholder(ctx, b) {
    const color = colorForKind(b.kind);
    ctx.save();
    // Feste Transparenz, damit Terrain noch leicht sichtbar bleibt
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);

    // einfache „Dach-/Schatten“-Andeutung
    ctx.beginPath();
    ctx.moveTo(b.x + 6, b.y + b.h - 6);
    ctx.lineTo(b.x + b.w - 6, b.y + b.h - 6);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#111';
    ctx.font = '12px system-ui, sans-serif';
    const label = (b.kind || '???').toUpperCase();
    ctx.fillText(label, b.x + 6, b.y + Math.max(14, Math.floor(b.h * 0.4)));
    ctx.restore();
  }

  function drawEntities(ctx) {
    const list = EntitiesState.buildings;
    if (!list || list.length === 0) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind);
      if (spr && spr !== 'error' && spr.complete) {
        // Sprite vorhanden → benutze es
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter
        drawPlaceholder(ctx, b);
      }
    }
  }

  // Renderer-Hook global machen
  window.drawEntities = drawEntities;

  // ---------- Öffentliche API ---------------------------------------------
  window.GameEntities = {
    __v: '17.6.0',
    place
  };

  // ---------- Abschluss-Log -----------------------------------------------
  L.info('Modul geladen (v17.6.0) – bereit. Platzhalter aktiv, HQ-Autospawn aktiv.');
})();
