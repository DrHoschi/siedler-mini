/* ============================================================================
 * Datei   : core/game.production.stone.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.12-stone-workarea-prod-v3-output-only
 *
 * Ziel dieser Version:
 *   ✅ Modul macht NUR noch Feld/Deko/Worker + lokalen Zyklus
 *   ✅ Output NUR noch über cb:prod:output (Zählen/Jobs macht game.production.js)
 *   ❌ Keine Production.addResource(...) mehr
 *   ❌ Keine enqueueCarryJob... mehr
 *
 * OUT:
 *   - cb:prod:output { bId, kind, item:'stone', qty, x,y,w,h }
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[prod-stone]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  const STONE_BUILDING_IDS = new Set([
    'b.quarry','b.steinbruch','steinbruch','quarry','b.stone','stone'
  ]);

  const STONES_PER_FIELD   = 9;
  const STONE_CYCLE_MS     = 6000;
  const WORKER_TRAVEL_MS   = 1400;
  const WORKER_TOTAL_MS    = WORKER_TRAVEL_MS * 2;
  const DEFAULT_RADIUS_TILES = 4;

  const StoneFields = new Map();

  function hashStringToSeed(str){
    let h = 0;
    for (let i = 0; i < str.length; i++){
      h = (h * 31 + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  function makeRng(seed){
    let s = (seed >>> 0) || 1;
    return function(){
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xFFFFFFFF;
    };
  }

  function pickRandom(arr, rng){
    if (!arr || !arr.length) return null;
    const r = (rng || Math.random)();
    const idx = Math.floor(r * arr.length) % arr.length;
    return arr[idx];
  }

  function isStoneBuildingId(id){
    if (!id) return false;
    return STONE_BUILDING_IDS.has(String(id).toLowerCase());
  }

  function createRandomLayoutForField(field){
    const rng = field.rng || Math.random;
    const radius = (field.workArea?.radiusTiles) || DEFAULT_RADIUS_TILES;

    const stones = [];
    const cx = field.cx;
    const cy = field.cy;

    for (let i = 0; i < STONES_PER_FIELD; i++){
      let tx, ty;
      let tries = 0;
      while (tries++ < 20){
        const ang  = rng() * Math.PI * 2;
        const dist = 1.0 + rng() * (radius - 0.5);
        tx = Math.round(cx + Math.cos(ang) * dist);
        ty = Math.round(cy + Math.sin(ang) * dist);
        if (!stones.some(s => s.tx === tx && s.ty === ty)) break;
      }
      stones.push({ tx, ty, active:true });
    }

    field.stones = stones;
  }

  function registerStoneFieldFromBuild(detail){
    if (!detail) return;
    const kind = (detail.id || detail.kind || '').toLowerCase();
    if (!isStoneBuildingId(kind)) return;

    const x   = detail.x | 0;
    const y   = detail.y | 0;
    const w   = (detail.w | 0) || 3;
    const h   = (detail.h | 0) || 3;
    const uid = detail.uid || `${kind}@${x},${y}`;

    const cx = x + w / 2;
    const cy = y + h / 2;

    const seed = hashStringToSeed(uid);
    const rng  = makeRng(seed);

    const existing = StoneFields.get(uid);
    const field = existing || {
      uid, kind,
      x, y, w, h,
      cx, cy,
      workArea: { cx, cy, radiusTiles: DEFAULT_RADIUS_TILES },
      stones   : [],
      worker   : null,
      cycleMs  : 0,
      rng,
      building : detail
    };

    field.x = x; field.y = y; field.w = w; field.h = h;
    field.cx = field.workArea?.cx || cx;
    field.cy = field.workArea?.cy || cy;
    field.building = detail;

    createRandomLayoutForField(field);
    StoneFields.set(uid, field);

    LOG('Steinfeld registriert:', field);
  }

  function updateWorkArea(detail){
    if (!detail) return;

    const kind = (detail.id || detail.buildingId || detail.kind || '').toLowerCase();
    if (!isStoneBuildingId(kind)) return;

    const x   = detail.x | 0;
    const y   = detail.y | 0;
    const uid = detail.uid || `${kind}@${x},${y}`;

    const field = StoneFields.get(uid);
    if (!field) return;

    const radius = (typeof detail.radiusTiles === 'number')
      ? detail.radiusTiles
      : (field.workArea?.radiusTiles || DEFAULT_RADIUS_TILES);

    field.workArea = {
      cx         : (typeof detail.cx === 'number') ? detail.cx : field.cx,
      cy         : (typeof detail.cy === 'number') ? detail.cy : field.cy,
      radiusTiles: radius
    };

    field.cx = field.workArea.cx;
    field.cy = field.workArea.cy;

    createRandomLayoutForField(field);
    LOG('Arbeitsbereich (Stein) aktualisiert:', uid, field.workArea);
  }

  // EINZIGER GLOBALER OUTPUT
  function emitProdOutput(field, item, qty){
    const bx0 = field.x | 0;
    const by0 = field.y | 0;
    const bw  = (field.w | 0) || 3;
    const bh  = (field.h | 0) || 3;

    const centerX = bx0 + bw / 2;
    const centerY = by0 + bh / 2;

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
    } catch(e){
      WARN('cb:prod:output dispatch fehlgeschlagen', e);
    }
  }

  function runStoneCycle(field){
    const stones = field.stones || [];
    const candidates = stones.filter(s => s.active);
    if (!candidates.length){
      field.worker = null;
      return;
    }

    const stone = pickRandom(candidates, field.rng);
    if (!stone) return;

    stone.active = false;

    // Output: Stein (Zählen/Jobs macht zentral)
    emitProdOutput(field, 'stone', 1);

    // Worker-Animation: vom Gebäudecenter zum Stein und zurück
    const bx0 = field.x | 0;
    const by0 = field.y | 0;
    const bw  = (field.w | 0) || 3;
    const bh  = (field.h | 0) || 3;

    const centerTx = bx0 + bw / 2;
    const centerTy = by0 + bh / 2;

    field.worker = {
      tMs        : 0,
      fromTx     : centerTx,
      fromTy     : centerTy,
      toTx       : stone.tx,
      toTy       : stone.ty,
      tNorm      : 0
    };
  }

  function tick(dtMs){
    const dt = dtMs || 0;

    for (const field of StoneFields.values()){
      field.cycleMs = (field.cycleMs || 0) + dt;
      if (field.cycleMs >= STONE_CYCLE_MS){
        field.cycleMs -= STONE_CYCLE_MS;
        runStoneCycle(field);
      }

      const w = field.worker;
      if (!w) continue;

      w.tMs += dt;
      if (w.tMs >= WORKER_TOTAL_MS){
        field.worker = null;
        continue;
      }

      const t = w.tMs / WORKER_TOTAL_MS;
      const phase = t <= 0.5 ? (t * 2) : (2 - t * 2);
      w.tNorm = Math.max(0, Math.min(1, phase));
    }
  }

  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx || !StoneFields.size) return;
    const ts = tileSize || 64;
    const z  = cam?.zoom || 1;
    const ox = cam?.x    || 0;
    const oy = cam?.y    || 0;

    ctx.save();

    for (const field of StoneFields.values()){
      // Steine
      for (const s of (field.stones || [])){
        if (!s.active) continue;

        const worldX = (s.tx + 0.5) * ts;
        const worldY = (s.ty + 0.75) * ts;

        const sx = (worldX - ox) * z;
        const sy = (worldY - oy) * z;

        const size = ts * 0.45 * z;

        ctx.save();
        ctx.fillStyle = 'rgba(130,130,130,0.95)';
        ctx.beginPath();
        ctx.ellipse(sx, sy, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(230,230,230,0.9)';
        ctx.ellipse(sx - size * 0.15, sy - size * 0.15, size * 0.25, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Worker
      const w = field.worker;
      if (w && w.tNorm >= 0 && w.tNorm <= 1){
        const wxTile = w.fromTx + (w.toTx - w.fromTx) * w.tNorm;
        const wyTile = w.fromTy + (w.toTy - w.fromTy) * w.tNorm;

        const worldX = (wxTile + 0.5) * ts;
        const worldY = (wyTile + 0.8) * ts;

        const sx = (worldX - ox) * z;
        const sy = (worldY - oy) * z;

        const rBody = ts * 0.25 * z;
        const rHead = rBody * 0.45;
        const bob   = Math.sin(w.tNorm * Math.PI * 2) * (ts * 0.06 * z);

        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(230,230,230,1)';
        ctx.ellipse(sx, sy - rBody * 0.2 + bob, rBody * 0.7, rBody, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = 'rgba(245,245,245,1)';
        ctx.arc(sx, sy - rBody * 1.4 + bob, rHead, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(80,80,80,1)';
        ctx.fillRect(
          sx + rBody * 0.6,
          sy - rBody * 0.4 + bob,
          rBody * 0.5,
          rBody * 0.18
        );
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function onBuildComplete(detail){
    try { registerStoneFieldFromBuild(detail); }
    catch(e){ ERR('onBuildComplete Fehler:', e); }
  }

  function onWorkAreaSet(detail){
    try { updateWorkArea(detail); }
    catch(e){ ERR('onWorkAreaSet Fehler:', e); }
  }

  if (window.Production && typeof window.Production.registerModule === 'function'){
    window.Production.registerModule({
      id: 'stone',
      tick,
      onBuildComplete,
      onWorkAreaSet
    });
  } else {
    WARN('Production.registerModule fehlt – Stein-Modul nicht angebunden');
  }

  // Fallback-Listener (wie bei dir)
  try{
    window.addEventListener('cb:build:complete', (ev)=>registerStoneFieldFromBuild(ev.detail||{}), {passive:true});
    window.addEventListener('cb:workarea:set',   (ev)=>updateWorkArea(ev.detail||{}), {passive:true});
  }catch(e){
    WARN('Browser-Event-Bindings fehlgeschlagen:', e);
  }

  window.ProductionStone = {
    fields : StoneFields,
    drawOnMainCanvas,
    _state : { StoneFields }
  };

  LOG('Stein-Produktion geladen v25.12.12-stone...output-only');
})();
