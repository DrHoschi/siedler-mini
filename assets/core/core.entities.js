/* ============================================================================
 * Datei: assets/core/core.entities.js
 * Version: v17.6.2
 * Projekt: Neue Siedler
 *
 * Zweck
 *  - Zentrale Entity-Verwaltung (nur Gebäude) + Platzierung + Rendering
 *  - Platzhalter-Render mit kategoriebasierten Farben, falls Sprite fehlt
 *  - Auto-Spawn: Rathaus in Kartenmitte beim Spielstart
 *
 * Abhängigkeiten
 *  - Renderer ruft window.drawEntities(ctx) nach dem Terrain an (ist gegeben)
 *  - optionale Kamera: window.GameCamera { x, y, zoom }, nur für Fallbacks
 *
 * Events (Eingang)
 *  - cb:game-start                 → Auto-Rathaus platzieren (einmalig)
 *  - cb:build:place {kind,x,y}     → Gebäude platzieren
 *  - build:action / cb:build-action {action:'place-<kind>'}
 *
 * Globale API
 *  - window.GameEntities.place(kind, x?, y?)
 *  - window.drawEntities(ctx)
 * ============================================================================ */

(() => {
  'use strict';

  // ---------- Log-Helfer ---------------------------------------------------
  const LOG  = (...a) => (window.CBLog?.info  || console.log)('[entities]', ...a);
  const OK   = (...a) => (window.CBLog?.ok    || console.log)('[entities]', ...a);
  const WARN = (...a) => (window.CBLog?.warn  || console.warn)('[entities]', ...a);
  const ERR  = (...a) => (window.CBLog?.error || console.error)('[entities]', ...a);

  // Doppel-Init vermeiden
  if (window.GameEntities?.__ready) {
    WARN('bereits initialisiert – skip');
    return;
  }

  // ---------- Registry (Sprite-Resolver) -----------------------------------
  // Alle Sprite-Pfade sind auf assets/buildings/*.png (lowercase) normalisiert.
  // Falls ein Key fehlt, wird ein generischer Name "<kind>.png" versucht.
  const SPRITE_ROOT = 'assets/buildings';

  const SPRITE_MAP = {
    // Verwaltung / Zentrum
    rathaus:        'rathaus_wood1.png',

    // Militär
    hq:             'hq_wood.png',            // Hauptquartier
    guardtower:     'wachturm_wood.png',

    // Wohnen
    house:          'wohnhaus_wood0_ug0.png',

    // Nahrung / Produktion
    fisher:         'fischer_wood1.png',
    farm:           'farm_wood.png',
    windmill:       'windmuehle_wood.png',
    baecker:        'baecker_wood.png',

    // Rohstoffe
    lumberjack:     'lumberjack_wood.png',
    stonecutter:    'steinmetz_wood.png',
    smith:          'schmied_wood0.png',

    // Logistik
    depot:          'depot_wood.png',
  };

  function resolveSpritePath(kind) {
    const file = SPRITE_MAP[kind] || (kind + '.png');
    return `${SPRITE_ROOT}/${file}`;
  }

  // ---------- Kategorien & Platzhalterfarben --------------------------------
  // Farben für Platzhalter (nicht für Platzierbar/Blockiert, die bleiben frei).
  const CATEGORY_BY_KIND = {
    rathaus:      'verwaltung',
    hq:           'militaer',
    guardtower:   'militaer',

    house:        'wohnen',

    fisher:       'nahrung',
    farm:         'nahrung',
    windmill:     'nahrung',
    baecker:      'nahrung',

    lumberjack:   'ressourcen',
    stonecutter:  'ressourcen',
    smith:        'produktion',

    depot:        'infrastruktur',
  };

  const CATEGORY_COLORS = {
    verwaltung   : { fill: 'rgba( 52,152,219,0.65)', stroke: 'rgba( 41,128,185,0.90)' }, // blau
    nahrung      : { fill: 'rgba( 46,204,113,0.65)', stroke: 'rgba( 39,174, 96,0.90)' }, // grün
    ressourcen   : { fill: 'rgba(155, 89,182,0.65)', stroke: 'rgba(142, 68,173,0.90)' }, // lila
    produktion   : { fill: 'rgba(230,126, 34,0.65)', stroke: 'rgba(211, 84,  0,0.90)' }, // orange
    wohnen       : { fill: 'rgba(241,196, 15,0.65)', stroke: 'rgba(243,156, 18,0.90)' }, // gelb
    infrastruktur: { fill: 'rgba(127,140,141,0.65)', stroke: 'rgba( 44, 62, 80,0.90)' }, // grau
    militaer     : { fill: 'rgba(231, 76, 60,0.65)', stroke: 'rgba(192, 57, 43,0.90)' }, // rot
    default      : { fill: 'rgba(255,185,  0,0.65)', stroke: 'rgba(  0,  0,  0,0.80)' }, // gold
  };

  function colorForKind(kind) {
    const cat = CATEGORY_BY_KIND[kind] || 'default';
    return CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;
  }

  // ---------- State ---------------------------------------------------------
  const state = {
    tile: 64,
    list: [],              // {id, kind, x, y, w, h, sprite?, cat}
    _id:  0,
    autoRathausDone: false
  };

  // ---------- Hilfen --------------------------------------------------------
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('map')  ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function snap(v, t = state.tile) {
    return Math.round(v / t) * t;
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera || {};
    const cvs = getCanvas();
    if (!cvs) return { x: 0, y: 0 };
    const scale = (cam.zoom ?? cam.scale ?? 1) || 1;
    const w = (cvs.width  / DPR) / scale;
    const h = (cvs.height / DPR) / scale;
    return { x: (cam.x || 0) + w / 2, y: (cam.y || 0) + h / 2 };
  }

  function mapCenterWorld() {
    // Versuche Map-Daten zu lesen (falls vorhanden), sonst Kamera-Mitte
    const m = (window.GameCore && window.GameCore.state && window.GameCore.state.map) || {};
    const t = m.tile || state.tile || 64;
    const cols = m.cols || 16;
    const rows = m.rows || 16;
    return { x: snap((cols * t) / 2, t), y: snap((rows * t) / 2, t) };
  }

  // ---------- Sprite-Lader --------------------------------------------------
  const SPRITES = new Map(); // kind -> HTMLImageElement | 'error' | 'loading'

  function loadSprite(kind) {
    if (!kind) return null;
    const prev = SPRITES.get(kind);
    if (prev && prev !== 'error') return prev;

    const path = resolveSpritePath(kind);
    const img  = new Image();
    SPRITES.set(kind, 'loading');
    img.onload  = () => { SPRITES.set(kind, img); OK('Sprite geladen:', kind, '←', path); };
    img.onerror = () => { SPRITES.set(kind, 'error'); WARN('Sprite fehlt / lädt nicht:', kind, path); };
    img.src = path;
    return img;
  }

  // ---------- Platzierung ---------------------------------------------------
  function place(kind, x, y) {
    if (!kind) return null;

    // Koordinaten-Default: Kamera-Mitte (Welt), dann aufs Grid snappen
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }
    x = snap(x);
    y = snap(y);

    const t = state.tile;
    const it = {
      id: ++state._id,
      kind,
      x, y,
      w: t, h: t,
      cat: CATEGORY_BY_KIND[kind] || 'default'
    };

    // Sprite-Ladevorgang anstoßen (Platzhalter greift solange)
    loadSprite(kind);

    state.list.push(it);
    OK('platziert:', kind, '→', x, y, `(gesamt: ${state.list.length} )`);
    return it;
  }

  // ---------- Auto-Spawn Rathaus -------------------------------------------
  function ensureRathausOnce() {
    if (state.autoRathausDone) return;
    state.autoRathausDone = true;

    // Kartenmitte bestimmen, Fallback Kamera-Mitte
    let c = mapCenterWorld();
    if ((c.x === 0 && c.y === 0) || Number.isNaN(c.x) || Number.isNaN(c.y)) {
      c = cameraCenterWorld();
      c.x = snap(c.x); c.y = snap(c.y);
    }

    place('rathaus', c.x, c.y);
    LOG(`Rathaus automatisch platziert (Kartenmitte): ${c.x} ${c.y}`);
  }

  // ---------- Rendering -----------------------------------------------------
  // Wird vom Terrain-Renderer pro Frame aufgerufen.
  window.drawEntities = function drawEntities(ctx) {
    const list = state.list;
    if (!list || list.length === 0) return;

    for (const b of list) {
      const spr = SPRITES.get(b.kind);

      if (spr && spr !== 'error' && spr !== 'loading' && spr.complete) {
        // Sprite zeichnen
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter zeichnen (kategorienbasiert)
        const col = colorForKind(b.kind);
        ctx.save();
        ctx.fillStyle   = col.fill;
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth   = 2;

        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);

        // Label
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(b.kind, b.x + 6, b.y + b.h / 2 + 4);
        ctx.restore();

        // Falls noch nie angestoßen, jetzt Sprite laden
        if (!spr) loadSprite(b.kind);
      }
    }
  };

  // ---------- Event-Bindings ------------------------------------------------
  // Moderner Weg
  window.addEventListener('cb:build:place', (ev) => {
    const d = ev?.detail || {};
    place(d.kind, d.x, d.y);
  });

  // Legacy/Fallback (Buttons senden "place-<kind>")
  function onBuildAction(ev) {
    const d = ev?.detail || {};
    const a = d.action || '';
    if (typeof a === 'string' && a.startsWith('place-')) {
      const kind = a.slice('place-'.length);
      place(kind);
    }
  }
  window.addEventListener('build:action', onBuildAction);
  window.addEventListener('cb:build-action', onBuildAction);

  // Auto-Spawn Rathaus einmalig zum Spielstart
  window.addEventListener('cb:game-start', ensureRathausOnce, { once: true });

  // ---------- Export / Ready-Flag ------------------------------------------
  window.GameEntities = {
    place,
    state,
    __ready: true
  };

  OK('drawEntities global gebunden → Renderer kann Entities zeichnen.');
  OK('Modul geladen (v17.6.2).');
})();
