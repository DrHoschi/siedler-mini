/* ============================================================================
 * Datei   : core/game.production.fish.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.12-fish-workarea-water-maincanvas-v3-output-only
 *
 * Ziel dieser Version:
 *   ✅ Modul macht WorkArea/Deko/Fische-Rendering + lokalen Fang-Zyklus
 *   ✅ Output NUR noch über cb:prod:output (Zählen/Jobs macht game.production.js)
 *   ❌ Keine Production.addResource(...) mehr
 *
 * OUT:
 *   - cb:prod:output { bId, kind, item:'fish', qty, x,y,w,h }
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[prod-fish]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  const FISH_BUILDING_IDS = new Set([
    'b.fish','b.fishery','b.fisher','b.fischer','fish','fishery','fisher','fischer'
  ]);

  const FISH_PER_FIELD   = 10;
  const FISH_RADIUS_MIN  = 2.0;
  const FISH_RADIUS_MAX  = 6.0;

  // Produktionstakt (einfacher Stub, bis echte Worker-Logik kommt)
  const FISH_CYCLE_MS    = 7000;

  const WATER_TILE_IDS = new Set([8, 9]);

  const FishFields = new Map();

  function rand(min, max){ return min + Math.random() * (max - min); }

  // ------------------------------------------------------------------------
  // Map / Tile Zugriff (best effort; wenn unbekannt -> keine harte Blockade)
  // ------------------------------------------------------------------------
  function getTileIdAt(tx, ty){
    // Diese Hooks sind absichtlich defensiv, weil wir nicht wissen,
    // wie dein Map-API in v4.0 final heißt.
    try{
      if (window.GameMap && typeof window.GameMap.getTileId === 'function'){
        return window.GameMap.getTileId(tx, ty);
      }
      if (window.Map && typeof window.Map.getTileId === 'function'){
        return window.Map.getTileId(tx, ty);
      }
      if (window.Game && window.Game.map && typeof window.Game.map.getTileId === 'function'){
        return window.Game.map.getTileId(tx, ty);
      }
    }catch(e){
      // ignorieren
    }
    return null; // unbekannt
  }

  function isWaterTile(tx, ty){
    const id = getTileIdAt(tx, ty);
    if (id === null) {
      // Wenn wir die Map nicht abfragen können, blocken wir nicht hart,
      // damit das Modul nicht "tot" ist.
      return true;
    }
    return WATER_TILE_IDS.has(id);
  }

  // ------------------------------------------------------------------------
  // OUTPUT
  // ------------------------------------------------------------------------
  function emitProdOutput(field, item, qty){
    const bx = field.x | 0;
    const by = field.y | 0;
    const bw = (field.w | 0) || 3;
    const bh = (field.h | 0) || 3;

    const centerX = bx + bw / 2;
    const centerY = by + bh / 2;

    try{
      dispatchEvent(new CustomEvent('cb:prod:output', {
        detail:{
          bId  : field.uid,
          uid  : field.uid,
          kind : field.kind,
          item : item,
          qty  : qty,
          x    : centerX,
          y    : centerY,
          w    : bw,
          h    : bh
        }
      }));
    }catch(e){
      WARN('cb:prod:output dispatch fehlgeschlagen', e);
    }
  }

  // ------------------------------------------------------------------------
  // FIELD-STATE
  // ------------------------------------------------------------------------
  function createFishField(building){
    const bw = Number.isFinite(building.w) ? building.w : 1;
    const bh = Number.isFinite(building.h) ? building.h : 1;

    const cx = building.x + bw / 2;
    const cy = building.y + bh / 2;

    const radiusTiles = building.workRadiusTiles || FISH_RADIUS_MAX;

    const fishes = [];
    for (let i = 0; i < FISH_PER_FIELD; i++){
      fishes.push({
        angle : rand(0, Math.PI * 2),
        dist  : rand(FISH_RADIUS_MIN, radiusTiles),
        phase : rand(0, Math.PI * 2)
      });
    }

    return {
      uid   : building.uid || ('fish-' + Date.now().toString(16)),
      kind  : building.id,
      x     : building.x,
      y     : building.y,
      w     : bw,
      h     : bh,
      cx,
      cy,
      radiusTiles,
      fishes,

      // NEU: lokaler Fang-Timer
      cycleMs: 0
    };
  }

  function getOrCreateFishField(building){
    const uid = building.uid || building.id;
    if (FishFields.has(uid)) return FishFields.get(uid);
    const st = createFishField(building);
    FishFields.set(uid, st);
    return st;
  }

  function updateWorkArea(detail){
    const uid = detail.uid || detail.id;
    if (!uid) return;
    const field = FishFields.get(uid);
    if (!field) return;

    field.cx          = detail.cx ?? field.cx;
    field.cy          = detail.cy ?? field.cy;
    field.radiusTiles = detail.radiusTiles || field.radiusTiles;
  }

  // ------------------------------------------------------------------------
  // PRODUKTIONS-TICK
  // ------------------------------------------------------------------------
  function tick(dtMs){
    const dt = dtMs || 0;

    for (const field of FishFields.values()){
      // Animation
      for (const f of field.fishes){
        f.phase += dt / 1000;
      }

      // Fang-Zyklus
      field.cycleMs += dt;
      if (field.cycleMs >= FISH_CYCLE_MS){
        field.cycleMs -= FISH_CYCLE_MS;

        // Wir wählen einen "Fisch" und prüfen best-effort Wasser
        const f = field.fishes[Math.floor(Math.random() * field.fishes.length)];
        const ang = f.angle;
        const dist = f.dist;

        const tx = Math.round(field.cx + Math.cos(ang) * dist);
        const ty = Math.round(field.cy + Math.sin(ang) * dist);

        if (isWaterTile(tx, ty)){
          // Output: Fish (Zählen/Jobs macht zentral)
          emitProdOutput(field, 'fish', 1);
        } else {
          // Wenn zufällig Land getroffen: wir überspringen diesen Zyklus einfach.
          // (Später: echtes Sampling nur auf Wasser)
          LOG('Fang übersprungen (kein Wasser an Tile)', tx, ty);
        }
      }
    }
  }

  // ------------------------------------------------------------------------
  // RENDERING (Deko)
  // ------------------------------------------------------------------------
  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx || !FishFields.size) return;
    const ts = tileSize || 64;
    const z  = cam.zoom || 1;
    const ox = cam.x   || 0;
    const oy = cam.y   || 0;

    for (const field of FishFields.values()){
      for (const f of field.fishes){
        const r   = f.dist;
        const ang = f.angle + Math.sin(f.phase) * 0.2;

        const worldX = (field.cx + Math.cos(ang) * r) * ts;
        const worldY = (field.cy + Math.sin(ang) * r) * ts;

        const sx = (worldX - ox) * z;
        const sy = (worldY - oy) * z;

        const size = ts * 0.25 * z;

        ctx.save();
        ctx.fillStyle = 'rgba(20,120,200,0.9)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, size * 0.8, size * 0.4, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ------------------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------------------
  function onBuildComplete(detail){
    if (!detail) return;
    const id = String(detail.id || '').toLowerCase();
    if (!FISH_BUILDING_IDS.has(id)) return;

    const st = getOrCreateFishField(detail);
    FishFields.set(st.uid, st);
  }

  function onWorkAreaSet(detail){
    if (!detail) return;
    updateWorkArea(detail);
  }

  if (window.Production && typeof window.Production.registerModule === 'function'){
    window.Production.registerModule({
      id: 'fish',
      tick,
      onBuildComplete,
      onWorkAreaSet
    });
  } else {
    WARN('Production.registerModule fehlt – Fisch-Modul nicht angebunden');
  }

  window.ProductionFish = {
    fields : FishFields,
    drawOnMainCanvas,
    _state : { FishFields }
  };

  LOG('Fisch-Produktion geladen v25.12.12-fish...output-only');
})();
