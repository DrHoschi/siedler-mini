/* ============================================================================
 * game.js — v17.3.2
 * Legacy-Fassade, um ältere Aufrufe nicht zu brechen. Keine Doppel-Init.
 * ============================================================================
 */
(function(){
  'use strict';
  window.Game = window.Game || {};

  Game.start = function(mapUrl){
    // Reiche an GameBoot weiter, falls vorhanden
    try{
      if (window.GameBoot?.start) return GameBoot.start(mapUrl);
      // Minimal: Engine direkt
      if (window.GameCore?.Engine?.start) return window.GameCore.Engine.start(mapUrl);
    }catch(e){ (window.CBLog?.warn||console.warn)('[game] start Fehler: '+(e?.message||e)); }
  };

  // Platzhalter-APIs, die der Inspector evtl. nutzt:
  Game.addResources = function(type, amount){
    (window.CBLog?.ok||console.log)('[game] addResources '+type+' +'+amount);
    // hier später Inventar aktualisieren …
  };

  Game.getTileSize = function(){ return window.GameCore?.state?.map?.tile || 64; };

  (window.CBLog?.ok||console.log)('Game gestartet (Facade v17.3.2)');
})();

// Fallback nur, wenn (noch) keine neue Engine vorhanden ist
(function(){
  'use strict';
  if (window.GameCore?.Engine) {
    (window.CBLog?.info||console.log)('[game] Legacy-Patch übersprungen (GameCore vorhanden)');
    return;
  }
  if (window.__legacy_build_bridge__) return; // doppelt vermeiden
  window.__legacy_build_bridge__ = true;

  // ... dein kompletter Patch-Code (Gebäude-Bridge, drawEntities, Events, etc.) ...
})();

/* -----------------------------------------------------------
 * Neue Siedler – Legacy Build-Integration (Add-On für game.js)
 * Zweck: Gebäude-Sichtbarkeit & einfache Platzierung
 * Abhängigkeiten: (optional) window.GameCamera, window.Render
 * Zeichnen: window.drawEntities(ctx) -> wird von core.render.js aufgerufen
 * ----------------------------------------------------------- */

(function () {
  'use strict';

  const LOG  = (...a)=> (window.CBLog?.info || console.log)('[game.entities]', ...a);
  const WARN = (...a)=> (window.CBLog?.warn || console.warn)('[game.entities]', ...a);

  // Stelle ein globales Game-Objekt sicher (legacy-freundlich)
  const Game = (window.Game = window.Game || {});
  const STATE = (Game.state = Game.state || {});

  // --- Konfiguration ------------------------------------------------------
  const TILE_SIZE = 64; // passt zu deinem Tileset/Renderer
  const SPRITE_BASE = 'assets/buildings'; // <kind>.png wird erwartet

  // --- Interner Zustand ---------------------------------------------------
  STATE.buildings = STATE.buildings || []; // [{id, kind, x, y, w, h, sprite?}]
  let _idSeq = STATE.buildings.length;

  // Sprite-Cache
  const SPRITES = new Map(); // kind -> HTMLImageElement | 'error'

  function loadSprite(kind) {
    if (SPRITES.has(kind)) return SPRITES.get(kind);
    const img = new Image();
    img.onload  = () => LOG('Sprite geladen:', kind);
    img.onerror = () => { SPRITES.set(kind, 'error'); WARN('Sprite fehlt:', kind); };
    img.src = `${SPRITE_BASE}/${kind}.png`;
    SPRITES.set(kind, img);
    return img;
  }

  // Hilfen
  function snapToGrid(v) { return Math.round(v / TILE_SIZE) * TILE_SIZE; }

  function cameraCenterWorld() {
    const cam = window.GameCamera;
    const cvs = document.getElementById('game') || document.querySelector('canvas');
    if (!cam || !cvs) return { x: 0, y: 0 };
    const w = cvs.width  / (window.devicePixelRatio || 1) / (cam.scale || 1);
    const h = cvs.height / (window.devicePixelRatio || 1) / (cam.scale || 1);
    return { x: cam.x + w/2, y: cam.y + h/2 };
  }

  function placeBuilding(kind, x, y) {
    if (!kind) return;
    // Fallback: Kamera-Mitte, wenn keine Koordinate mitgegeben wurde
    if (typeof x !== 'number' || typeof y !== 'number') {
      const c = cameraCenterWorld();
      x = c.x; y = c.y;
    }
    // Grid-Snapping
    const gx = snapToGrid(x);
    const gy = snapToGrid(y);

    // Eintrag
    const b = {
      id: ++_idSeq,
      kind,
      x: gx, y: gy,
      w: TILE_SIZE, h: TILE_SIZE
    };

    // Sprite schonmal anstoßen (lazy draw lädt sonst)
    loadSprite(kind);

    STATE.buildings.push(b);
    LOG('platziert:', kind, '→', gx, gy, '(gesamt:', STATE.buildings.length, ')');
    return b;
  }

  // --- Events vom Bau-UI --------------------------------------------------
  // 1) Moderner Weg: cb:build:place mit detail { kind, x, y }
  window.addEventListener('cb:build:place', (ev) => {
    const d = ev?.detail || {};
    placeBuilding(d.kind, d.x, d.y);
  });

  // 2) Legacy/Fallback: cb:build-action mit detail { action: 'place-XXX' }
  window.addEventListener('cb:build-action', (ev) => {
    const d = ev?.detail || {};
    const act = d.action || '';
    if (act.startsWith('place-')) {
      const kind = act.replace('place-', '');
      // hier kommen meist keine Koordinaten → Kamera-Mitte verwenden
      placeBuilding(kind);
    }
  });

  // --- Zeichnen: vom Renderer aufgerufen ----------------------------------
  window.drawEntities = function drawEntities(ctx) {
    if (!STATE.buildings || !STATE.buildings.length) return;

    for (const b of STATE.buildings) {
      const spr = SPRITES.get(b.kind) || loadSprite(b.kind);

      if (spr && spr !== 'error' && spr.complete) {
        // Sprite vorhanden
        ctx.drawImage(spr, b.x, b.y, b.w, b.h);
      } else {
        // Platzhalter (falls Sprite noch lädt/fehlt)
        ctx.save();
        ctx.fillStyle = 'rgba(255, 185, 0, 0.85)'; // goldener Platzhalter
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        // Label
        ctx.fillStyle = '#111';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(b.kind || '???', b.x + 6, b.y + b.h/2 + 4);
        ctx.restore();
      }
    }
  };

  // --- Öffentliche API (optional) -----------------------------------------
  Game.place = placeBuilding;

  LOG('Gebäude-Bridge aktiv. (buildings:', STATE.buildings.length, ')');
})();
