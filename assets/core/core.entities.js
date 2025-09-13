/* ============================================================================
 * Datei: assets/core/core.entities.js
 * Version: v17.6.1
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Einheitliche Entities/Building-Schicht (State + Zeichnen)
 *  - Platzhalter-Render (immer sichtbar) + Kategorie-Farben
 *  - Auto-Spawn Rathaus in Kartenmitte bei Spielstart
 *  - Event-Brücke: legacy (build:action) & modern (cb:build:place)
 *  - Stellt window.drawEntities(ctx) bereit (vom Renderer aufgerufen)
 *
 * Abhängigkeiten:
 *  - window.GameCamera (x, y, zoom/scale) – für Kamera-Mitte
 *  - core.render ruft window.drawEntities(ctx) JE FRAME auf (Welt-Transform aktiv!)
 * ============================================================================ */

(() => {
  'use strict';

  const TAG = '[entities]';
  const LOG = {
    ok  : (...a)=> (window.CBLog?.ok    || console.log)(TAG, ...a),
    info: (...a)=> (window.CBLog?.info  || console.log)(TAG, ...a),
    warn: (...a)=> (window.CBLog?.warn  || console.warn)(TAG, ...a),
    err : (...a)=> (window.CBLog?.error || console.error)(TAG, ...a),
  };

  // Mehrfache Inits vermeiden
  if (window.Entities?.__ready) {
    LOG.info('bereits initialisiert – skip.');
    return;
  }

  // ---------------------------------------------------------------------------
  // Registry (Kategorien + Mapping)
  // ---------------------------------------------------------------------------
  const REGISTRY = {
    version: '1.0.0',
    // Diese Farben kollidieren NICHT mit „platzierbar / nicht platzierbar“.
    categories: {
      admin : { name: 'Verwaltung',         fill: '#6C5CE7', stroke: '#3B2DD8' }, // violett
      food  : { name: 'Nahrung',            fill: '#F39C12', stroke: '#C97E00' }, // orange
      res   : { name: 'Rohstoffe',          fill: '#00B894', stroke: '#009077' }, // türkis
      infra : { name: 'Infrastruktur',      fill: '#7F8C8D', stroke: '#566364' }, // grau
      deco  : { name: 'Deko/Landschaft',    fill: '#2ECC71', stroke: '#1F9E52' }, // grün (UI, nicht „platzierbar“)
      mili  : { name: 'Militär',            fill: '#E74C3C', stroke: '#B03A2E' }, // rot (UI)
      house : { name: 'Wohnen',             fill: '#3498DB', stroke: '#2875A5' }, // blau
      unknown: { name: 'Unbekannt',         fill: '#F1C40F', stroke: '#B7950B' }, // gelb
    },
    // Bekannte Buildings → Kategorie + Spritepfad
    buildings: {
      rathaus      : { cat:'admin', sprite:'assets/buildings/rathaus_wood1.png' },
      hq           : { cat:'mili',  sprite:'assets/tex/building/wood/hq_wood.PNG' },
      house        : { cat:'house', sprite:'assets/buildings/wohnhaus_wood0_ug0.png' },
      depot        : { cat:'admin', sprite:'assets/buildings/depot_wood.png' },
      farm         : { cat:'food',  sprite:'assets/buildings/farm_wood.png' },
      fisher       : { cat:'food',  sprite:'assets/buildings/fischer_wood1.png' },
      lumberjack   : { cat:'res',   sprite:'assets/buildings/lumberjack_wood.png' },
      stonecutter  : { cat:'res',   sprite:'assets/buildings/steinmetz_wood.png' },
      smith        : { cat:'res',   sprite:'assets/buildings/schmied_wood0.png' },
      windmill     : { cat:'food',  sprite:'assets/buildings/windmuehle_wood.png' },
      guardtower   : { cat:'mili',  sprite:'assets/buildings/wachturm_wood.png' },
      // weitere kannst du später hier ergänzen…
    }
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const DPR = Math.max(1, window.devicePixelRatio || 1);
  const Entities = (window.Entities = {
    __ready: false,
    list: [],           // {id, kind, x, y, w, h, cat, sprite?, alpha?}
    idseq: 0,
    tile: 64,           // Default; kann von außen angepasst werden
    debug: false,       // true → zeigt Markierungen
    REGISTRY
  });

  // Sprite-Cache
  const SPRITES = new Map(); // kind → HTMLImageElement | 'error'

  // ---------------------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------------------
  function snap64(v) { return Math.round(v / Entities.tile) * Entities.tile; }

  function canvasEl() {
    return (
      document.getElementById('game') ||
      document.getElementById('game-canvas') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera || {};
    const cvs = canvasEl();
    if (!cvs) return { x: 0, y: 0 };

    const scale = cam.zoom ?? cam.scale ?? 1;
    const w = (cvs.width  / DPR) / scale;
    const h = (cvs.height / DPR) / scale;
    const x = (cam.x || 0) + w / 2;
    const y = (cam.y || 0) + h / 2;
    return { x, y };
  }

  function resolveCat(kind) {
    const meta = REGISTRY.buildings[kind];
    return (meta && meta.cat) || 'unknown';
  }

  function resolveSprite(kind) {
    const meta = REGISTRY.buildings[kind];
    return meta?.sprite || null;
  }

  function catColors(kind) {
    const catKey = resolveCat(kind);
    return REGISTRY.categories[catKey] || REGISTRY.categories.unknown;
  }

  function loadSprite(kind) {
    const path = resolveSprite(kind);
    if (!path) return 'error';
    if (SPRITES.has(kind)) return SPRITES.get(kind);

    const img = new Image();
    img.onload  = () => LOG.info('Sprite geladen:', kind, '←', path);
    img.onerror = () => { SPRITES.set(kind, 'error'); LOG.warn('Sprite fehlt / lädt nicht:', kind, path); };
    img.src = path;
    SPRITES.set(kind, img);
    return img;
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------
  function place(kind, x, y, opts={}) {
    if (!kind) return null;

    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }

    const t = Entities.tile;
    const b = {
      id   : ++Entities.idseq,
      kind,
      cat  : resolveCat(kind),
      x    : snap64(x),
      y    : snap64(y),
      w    : t,
      h    : t,
      alpha: typeof opts.alpha === 'number' ? opts.alpha : 1
    };

    // Sprite anstoßen
    loadSprite(kind);

    Entities.list.push(b);
    LOG.ok('platziert:', kind, '→', b.x, b.y, '(gesamt:', Entities.list.length, ')');
    return b;
  }

  // Legacy-Komfort
  window.Game = window.Game || {};
  window.Game.place = place;

  // ---------------------------------------------------------------------------
  // Zeichnen (vom Renderer aufgerufen – Welt-Transform ist aktiv!)
  // ---------------------------------------------------------------------------
  function drawEntities(ctx) {
    const list = Entities.list;
    if (!list || list.length === 0) return;

    for (const b of list) {
      const col = catColors(b.kind);
      const spr = SPRITES.get(b.kind) || loadSprite(b.kind);

      // 1) Platzhalter (immer) – leicht sichtbar, abgerundet
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle   = col.fill;
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth   = 2;

      // runde Ecken
      const r = 8;
      const x = b.x, y = b.y, w = b.w, h = b.h;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#0d1117';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(b.kind, x + 6, y + h/2 + 4);
      ctx.restore();

      // 2) Sprite (falls vorhanden) – leicht über dem Platzhalter
      if (spr && spr !== 'error' && spr.complete) {
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
        ctx.restore();
      }

      // Debug-Overlay (optional)
      if (Entities.debug) {
        ctx.save();
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.w, b.y + b.h);
        ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x, b.y + b.h);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Exponieren (Renderer ruft das direkt auf)
  window.drawEntities = drawEntities;

  // ---------------------------------------------------------------------------
  // Auto-Spawn Rathaus (bei Spielstart) – Mitte des sichtbaren Bereichs
  // ---------------------------------------------------------------------------
  function autoCenterRathaus() {
    // Schon vorhanden? – dann nicht doppeln
    if (Entities.list.some(e => e.kind === 'rathaus')) return;

    const c = cameraCenterWorld();
    const b = place('rathaus', c.x, c.y);
    LOG.info('Rathaus automatisch platziert (Kartenmitte):', b.x, b.y);
  }

  // ---------------------------------------------------------------------------
  // Events binden
  // ---------------------------------------------------------------------------
  // Moderner Weg
  window.addEventListener('cb:build:place', (ev) => {
    const d = ev?.detail || {};
    if (!d.kind) return;
    place(d.kind, d.x, d.y);
  });

  // Legacy/Fallback
  function onBuildAction(ev) {
    const d = ev?.detail || {};
    const act = d.action || '';
    if (!act || !act.startsWith('place-')) return;
    const kind = act.slice('place-'.length);
    place(kind);
  }
  window.addEventListener('build:action', onBuildAction);
  window.addEventListener('cb:build-action', onBuildAction);

  // Spielstart → Rathaus in die Mitte
  window.addEventListener('cb:game-start', () => {
    // Ein Tick warten, damit Kamera/Canvas Maße stehen
    setTimeout(autoCenterRathaus, 0);
  });

  Entities.__ready = true;
  LOG.info('Modul geladen (v17.6.1).');
})();
