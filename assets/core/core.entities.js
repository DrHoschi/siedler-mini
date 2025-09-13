/* ============================================================================
 * Datei: assets/core/core.entities.js
 * Version: v17.6.2
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Verwaltet Entities/Gebäude (State, Platzierung)
 *  - Zeichnet Gebäude (Sprites ODER Platzhalter-Rechtecke nach Kategorie)
 *  - Autospawn "rathaus" in Kartenmitte bei Spielstart
 *  - Nutzt EntitiesRegistry (falls vorhanden) für Sprite-/Kategorieauflösung
 *
 * Abhängigkeiten (optional):
 *  - window.EntitiesRegistry (assets/core/entities.registry.js)
 *  - Renderer ruft window.drawEntities(ctx) auf (siehe core.render.js)
 *  - UI sendet build-Events: "cb:build:place" oder "build:action"
 * ============================================================================ */

(() => {
  'use strict';

  const TAG = '[entities]';
  const log = (...a) => (window.CBLog?.info || console.log)(TAG, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn)(TAG, ...a);
  const err = (...a) => (window.CBLog?.error || console.error)(TAG, ...a);

  // ----------------------------------------------------------------------------------
  // State
  // ----------------------------------------------------------------------------------
  const Entities = (window.Entities = window.Entities || {});
  const state = (Entities.state = Entities.state || {
    _idseq: 0,
    list: [],        // { id, kind, x, y, w, h, cat }
    tile: 64,
    started: false
  });

  // Device Pixel Ratio (für Kamera-Umrechnung in core.render.js)
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  // ----------------------------------------------------------------------------------
  // Kategorien & Platzhalterfarben (nur verwendet, wenn keine Registry existiert)
  // ACHTUNG: Rot/Grün NICHT nutzen (reserviert für Platzierbar-Check)
  // ----------------------------------------------------------------------------------
  const FALLBACK_CATEGORY_FOR_KIND = {
    // Verwaltung
    'rathaus': 'verwaltung',
    'depot': 'verwaltung',

    // Nahrung
    'farm': 'nahrung',
    'fisher': 'nahrung',
    'baecker': 'nahrung',

    // Ressourcen
    'lumberjack': 'ressourcen',
    'stonecutter': 'ressourcen',
    'smith': 'ressourcen',
    'windmill': 'ressourcen',

    // Wohnen
    'house': 'wohnen',

    // Militär
    'hq': 'militaer',
    'guardtower': 'militaer',
  };

  const FALLBACK_CATEGORY_COLORS = {
    verwaltung: 'rgba(52, 152, 219, 0.85)',   // blau
    nahrung:    'rgba(241, 196, 15, 0.85)',   // gelb
    ressourcen: 'rgba(230, 126, 34, 0.85)',   // orange
    wohnen:     'rgba(142, 68, 173, 0.85)',   // violett
    militaer:   'rgba(127, 140, 141, 0.85)',  // grau
    default:    'rgba(149, 165, 166, 0.85)',  // hellgrau
  };

  // ----------------------------------------------------------------------------------
  // Sprite-Auflösung (Registry bevorzugt, sonst lokale Map)
  // (Wir verwenden ausschl. Pfade aus deiner aktuellen filelist)
  // ----------------------------------------------------------------------------------
  const LOCAL_SPRITES = {
    // Verwaltung
    rathaus:     'assets/buildings/rathaus_wood1.png',
    depot:       'assets/buildings/depot_wood.png',

    // Nahrung
    farm:        'assets/buildings/farm_wood.png',
    fisher:      'assets/buildings/fischer_wood1.png',
    baecker:     'assets/buildings/baecker_wood.png',

    // Ressourcen
    lumberjack:  'assets/buildings/lumberjack_wood.png',
    stonecutter: 'assets/buildings/steinmetz_wood.png',
    smith:       'assets/buildings/schmied_wood0.png',
    windmill:    'assets/buildings/windmuehle_wood.png',

    // Wohnen
    house:       'assets/buildings/wohnhaus_wood0_ug0.png',

    // Militär
    guardtower:  'assets/buildings/wachturm_wood.png',
    // HQ liegt in deinem Repo (noch) NICHT unter assets/buildings → Fallback:
    hq:          'assets/tex/building/wood/hq_wood.PNG'
  };

  // Cache geladener Image-Objekte
  const SPRITES = new Map(); // kind -> HTMLImageElement | 'error' | null

  function resolveCategory(kind) {
    const reg = window.EntitiesRegistry;
    if (reg?.getCategoryForKind) {
      return reg.getCategoryForKind(kind) || 'default';
    }
    return FALLBACK_CATEGORY_FOR_KIND[kind] || 'default';
  }

  function resolveSprite(kind) {
    const reg = window.EntitiesRegistry;
    if (reg?.resolveSprite) {
      return reg.resolveSprite(kind) || null;
    }
    return LOCAL_SPRITES[kind] || null;
  }

  function loadSprite(kind) {
    if (SPRITES.has(kind)) return SPRITES.get(kind);
    const url = resolveSprite(kind);
    if (!url) {
      SPRITES.set(kind, 'error');
      warn('Kein Sprite-Pfad für', kind);
      return 'error';
    }
    const img = new Image();
    img.onload = () => log('Sprite geladen:', kind, '←', url);
    img.onerror = () => { SPRITES.set(kind, 'error'); warn('Sprite fehlt / lädt nicht:', kind, url); };
    img.src = url;
    SPRITES.set(kind, img);
    return img;
  }

  // ----------------------------------------------------------------------------------
  // Hilfsfunktionen
  // ----------------------------------------------------------------------------------
  function snap(v, t = state.tile) { return Math.round(v / t) * t; }

  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('map') ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function cameraCenterWorld() {
    const cam = window.GameCamera || {};
    const cvs = getCanvas();
    if (!cvs) return { x: 0, y: 0 };
    const s = cam.zoom || cam.scale || 1;
    const w = (cvs.width  / DPR) / s;
    const h = (cvs.height / DPR) / s;
    const x = (cam.x || 0) + w / 2;
    const y = (cam.y || 0) + h / 2;
    return { x, y };
  }

  // ----------------------------------------------------------------------------------
  // Platzierung
  // ----------------------------------------------------------------------------------
  function place(kind, x, y) {
    if (!kind) return null;

    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }
    const t = state.tile;
    const e = {
      id: ++state._idseq,
      kind,
      cat: resolveCategory(kind),
      x: snap(x, t),
      y: snap(y, t),
      w: t,
      h: t
    };
    // Sprite-Preload (optional; Platzhalter rendert auch, wenn (noch) nicht geladen)
    loadSprite(kind);

    state.list.push(e);
    log(`platziert: ${kind} → ${e.x} ${e.y} (gesamt: ${state.list.length} )`);
    return e;
  }

  // ----------------------------------------------------------------------------------
  // Autospawn Rathaus zur Kartenmitte bei Game-Start
  // ----------------------------------------------------------------------------------
  function autoPlaceTownHall() {
    // nur einmal beim Start
    if (state.list.some(b => b.kind === 'rathaus')) return;
    const c = cameraCenterWorld();
    const e = place('rathaus', c.x, c.y);
    if (e) log(`Rathaus automatisch platziert (Kartenmitte): ${e.x} ${e.y}`);
  }

  // ----------------------------------------------------------------------------------
  // Zeichnen (vom Renderer aufgerufen)
  // ----------------------------------------------------------------------------------
  window.drawEntities = function drawEntities(ctx) {
    // Sicher: nichts tun, wenn noch keine Entities
    if (!state?.list || state.list.length === 0) return;

    for (const b of state.list) {
      const spr = SPRITES.get(b.kind) || loadSprite(b.kind);

      if (spr && spr !== 'error' && spr.complete) {
        // Sprite gezeichnet
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter (Farbe je Kategorie)
        ctx.save();
        const color = (window.EntitiesRegistry?.getColorForCategory?.(b.cat)) ||
                      (FALLBACK_CATEGORY_COLORS[b.cat] || FALLBACK_CATEGORY_COLORS.default);
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        // Label
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(b.kind, b.x + 6, b.y + b.h/2 + 4);
        ctx.restore();
      }
    }
  };

  // ----------------------------------------------------------------------------------
  // Event-Wiring
  // ----------------------------------------------------------------------------------
  function onBuildPlace(ev) {
    const d = ev?.detail || {};
    place(d.kind, d.x, d.y);
  }
  function onBuildAction(ev) {
    const d = ev?.detail || {};
    const a = d.action || '';
    if (!a || !a.startsWith('place-')) return;
    place(a.slice('place-'.length));
  }

  window.addEventListener('cb:build:place', onBuildPlace);
  window.addEventListener('build:action', onBuildAction);
  window.addEventListener('cb:build-action', onBuildAction);

  // Beim Spielstart einmal Rathaus setzen (nachdem Kamera/Canvas stehen)
  window.addEventListener('cb:game-start', () => {
    // kurzer Tick, damit Render/Camera init sind
    setTimeout(autoPlaceTownHall, 0);
  });

  // Öffentliche Schnell-API (z. B. für Inspector):
  Entities.place = place;

  log('Modul geladen (v17.6.2).');
})();
