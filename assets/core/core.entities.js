/* ============================================================================
 * Datei: assets/core/core.entities.js
 * Version: v17.6.2
 * Projekt: Neue Siedler
 *
 * Aufgaben:
 * - Entity/Building-Verwaltung (Listen, Platzieren)
 * - Platzhalter-Render (farbcodiert nach Kategorie aus EntitiesRegistry)
 * - Rathaus beim Spielstart einmalig zentriert platzieren
 * - Globale Zeichenfunktion: window.drawEntities(ctx)
 *
 * Erwartung:
 * - Renderer hat Welt-Transform bereits gesetzt (keine UI-Skalierung)
 * - Kamera optional in window.GameCamera {x,y,zoom} (nur für Fallback-Coords)
 * - Registry optional in window.EntitiesRegistry (Farben, Sprite-Pfade, Kategorien)
 * ============================================================================ */
(function () {
  'use strict';

  const TAG  = '[entities]';
  const LOG  = (...a) => (window.CBLog?.info  || console.log)(TAG, ...a);
  const OK   = (...a) => (window.CBLog?.ok    || console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const Entities = (window.Entities = window.Entities || {});
  if (Entities.__ready__) {
    WARN('bereits initialisiert – skip');
    return;
  }

  const DPR = Math.max(1, window.devicePixelRatio || 1);

  const state = {
    tile   : 64,
    list   : [],          // { id, kind, x, y, w, h, cat }
    idseq  : 0,
    placedDefaults: false
  };

  // Registry (optional, aber hilfreich)
  const REG = (window.EntitiesRegistry || {});
  const CAT_COLORS = (REG.categoryColors || {
    Verwaltung  : '#5964ff',
    Nahrung     : '#5abf0d',
    Rohstoffe   : '#bf7b0d',
    Wohnen      : '#8f44fd',
    Infrastruktur: '#0aa2c0',
    Deko        : '#a3a3a3',
    Militär     : '#d9534f',
    __default   : '#f0c419'
  });

  const SPRITES = new Map(); // key: kind → HTMLImageElement|'error'
  const SPRITE_BASE = '';    // Registry liefert Pfade; sonst leer

  // ---------------------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------------------
  function snap(v) {
    return Math.round(v / state.tile) * state.tile;
  }

  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('game-canvas') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function worldCenterFallback() {
    const cvs = getCanvas();
    const cam = window.GameCamera || {};
    const zoom = Number.isFinite(cam.zoom) && cam.zoom > 0 ? cam.zoom : 1;
    if (!cvs) return { x: 0, y: 0 };

    const wWorld = (cvs.width  / DPR) / zoom;
    const hWorld = (cvs.height / DPR) / zoom;
    const x = (Number(cam.x) || 0) + wWorld / 2;
    const y = (Number(cam.y) || 0) + hWorld / 2;
    return { x, y };
  }

  function kindToCategory(kind) {
    // Über Registry, sonst schätzen
    const byKind = REG.kinds && REG.kinds[kind];
    if (byKind && byKind.cat) return byKind.cat;

    // Heuristik:
    if (/rathaus/i.test(kind)) return 'Verwaltung';
    if (/hq|hauptquartier/i.test(kind)) return 'Militär';
    if (/farm|fischer|baecker|bäcker|muehle|mühle/i.test(kind)) return 'Nahrung';
    if (/lumber|holz|stein|smith|schmied|steinmetz/i.test(kind)) return 'Rohstoffe';
    if (/haus|wohn/i.test(kind)) return 'Wohnen';
    if (/road|weg|pfad|straße/i.test(kind)) return 'Infrastruktur';
    return '__default';
  }

  function colorFor(kind) {
    const cat = kindToCategory(kind);
    return CAT_COLORS[cat] || CAT_COLORS.__default || '#f0c419';
  }

  function spritePathFor(kind) {
    // Bevorzugt Registry
    const byKind = REG.kinds && REG.kinds[kind];
    if (byKind && byKind.sprite) return byKind.sprite;

    // Harte Fallbacks auf deine Dateiliste
    switch (kind) {
      case 'rathaus':   return 'assets/buildings/rathaus_wood1.png';
      case 'hq':        return 'assets/tex/building/wood/hq_wood.PNG';
      case 'house':     return 'assets/buildings/wohnhaus_wood0_ug0.png';
      case 'depot':     return 'assets/buildings/depot_wood.png';
      case 'farm':      return 'assets/buildings/farm_wood.png';
      case 'fisher':    return 'assets/buildings/fischer_wood1.png';
      case 'lumberjack':return 'assets/buildings/lumberjack_wood.png';
      case 'smith':     return 'assets/buildings/schmied_wood0.png';
      case 'stonecutter':return 'assets/buildings/steinmetz_wood.png';
      case 'guardtower':return 'assets/buildings/wachturm_wood.png';
      case 'windmill':  return 'assets/buildings/windmuehle_wood.png';
      default:          return null; // kein Sprite → Platzhalter
    }
  }

  function loadSprite(kind) {
    if (!kind) return null;
    if (SPRITES.has(kind)) return SPRITES.get(kind);

    const path = spritePathFor(kind);
    if (!path) {
      SPRITES.set(kind, 'error');
      return 'error';
    }
    const img = new Image();
    img.onload  = () => OK('Sprite geladen:', kind, '←', path);
    img.onerror = () => { SPRITES.set(kind, 'error'); WARN('Sprite fehlt:', kind, '(', path, ')'); };
    img.src = (SPRITE_BASE ? SPRITE_BASE + '/' : '') + path;
    SPRITES.set(kind, img);
    return img;
  }

  // ---------------------------------------------------------------------------
  // API: Platzieren & Zeichnen
  // ---------------------------------------------------------------------------
  function place(kind, x, y, opts = {}) {
    if (!kind) return null;

    // Fallback: Kamera-/Viewport-Mitte
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const c = worldCenterFallback();
      x = c.x; y = c.y;
    }
    x = snap(x); y = snap(y);

    const t = state.tile;
    const ent = {
      id  : ++state.idseq,
      kind: String(kind),
      x, y, w: t, h: t,
      cat : kindToCategory(kind),
      meta: opts.meta || null
    };

    // Sprite lazy anstoßen (wenn vorhanden)
    loadSprite(ent.kind);

    state.list.push(ent);
    LOG('platziert:', ent.kind, '→', ent.x, ent.y, '(gesamt:', state.list.length, ')');
    return ent;
  }

  function drawPlaceholder(ctx, e) {
    // Farben/Alpha je Kategorie
    const base = colorFor(e.kind);
    // leichte Transparenz, gute Kanten
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = base;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 2;

    const r = 6; // leichte Abrundung
    const x = e.x, y = e.y, w = e.w, h = e.h;
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
    ctx.fillStyle = '#111';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(e.kind, x + 6, y + h / 2 + 4);
    ctx.restore();
  }

  function draw(ctx) {
    if (!state.list.length) return;
    // WICHTIG: keine Transform-Änderung! Renderer hat Welt-Transform bereits gesetzt.
    for (const e of state.list) {
      const spr = SPRITES.get(e.kind) || loadSprite(e.kind);
      if (spr && spr !== 'error' && spr.complete) {
        ctx.drawImage(spr, e.x, e.y, e.w, e.h);
      } else {
        drawPlaceholder(ctx, e);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Autoplace Rathaus (einmalig)
  // ---------------------------------------------------------------------------
  function autoPlaceRathausOnce() {
    if (state.placedDefaults) return;

    // Map-Mitte (wenn bekannt), sonst Viewport-Mitte
    let cx, cy;
    const map = window.GameCore?.state?.map;
    if (map && map.cols && map.rows && map.tile) {
      cx = (map.cols * map.tile) / 2;
      cy = (map.rows * map.tile) / 2;
    } else {
      const c = worldCenterFallback();
      cx = c.x; cy = c.y;
    }

    const r = place('rathaus', cx, cy);
    if (r) OK('Rathaus automatisch platziert (Kartenmitte):', r.x, r.y);
    state.placedDefaults = true;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  // Moderner Weg
  window.addEventListener('cb:build:place', (ev) => {
    const d = ev?.detail || {};
    place(d.kind, d.x, d.y);
  });

  // Legacy Weg
  function onBuildAction(ev) {
    const d = ev?.detail || {};
    const act = d.action || '';
    if (!act || !act.startsWith('place-')) return;
    const kind = act.slice('place-'.length);
    place(kind);
  }
  window.addEventListener('build:action', onBuildAction);
  window.addEventListener('cb:build-action', onBuildAction);

  // Beim Spielstart Rathaus zentrieren
  window.addEventListener('cb:game-start', autoPlaceRathausOnce);

  // ---------------------------------------------------------------------------
  // Public API / Export
  // ---------------------------------------------------------------------------
  Entities.place = place;
  Entities.draw  = draw;
  Entities.list  = state.list;
  Entities.state = state;

  // WICHTIG: globaler Alias, den der Renderer aufruft
  window.drawEntities = function (ctx) { draw(ctx); };

  Entities.__ready__ = true;
  OK('Modul geladen (v17.6.2).');
})();
