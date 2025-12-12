/* ============================================================================
 * Datei   : core/game.production.wood.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.12-wood-workarea-maincanvas-forest-worker-v3-output-only
 *
 * Ziel dieser Version:
 *   ✅ Modul macht NUR noch lokalen Zyklus + Deko/Animation
 *   ✅ Output NUR noch über cb:prod:output (Zählen/Jobs macht game.production.js)
 *   ❌ Keine Production.addResource(...) mehr
 *   ❌ Keine enqueueCarryJob... mehr
 *
 * OUT:
 *   - cb:prod:output { bId, kind, item:'wood', qty, x,y,w,h }
 * ========================================================================== */

(function(){
  'use strict';

  // ========================================================================
  // LOGGING / META
  // ========================================================================

  const TAG  = '[prod-wood]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  // ========================================================================
  // KONSTANTEN
  // ========================================================================

  const LUMBERJACK_ID = 'b.lumberjack';

  const LJ_PHASE = {
    IDLE  : 'idle',
    PLANT : 'plant',
    GROW  : 'grow',
    READY : 'ready',
    CUT   : 'cut'
  };

  const LJ_TIMES = {
    PLANT : 2000,
    GROW  : 8000,
    CUT   : 2000,
    REST  : 1000
  };

  const TREES_PER_FIELD = 10;

  const TREE_RADIUS_MIN         = 1.0;
  const TREE_RADIUS_MAX_DEFAULT = 3.0;

  const WORKER_WALK_TIME = 2000;
  const WORKER_REST_TIME = 1000;

  // ========================================================================
  // HILFSFUNKTIONEN
  // ========================================================================

  function rand(min, max){
    return min + Math.random() * (max - min);
  }

  // ========================================================================
  // STATE
  // ========================================================================

  const Lumberjacks = new Map();

  function createLumberjackState(building){
    const bw = Number.isFinite(building.w) ? building.w : 1;
    const bh = Number.isFinite(building.h) ? building.h : 1;

    const cx = building.x + bw / 2;
    const cy = building.y + bh / 2;

    const radiusTiles = building.workRadiusTiles || TREE_RADIUS_MAX_DEFAULT;

    return {
      uid   : building.uid || ('lj-' + Date.now().toString(16)),
      kind  : building.id  || LUMBERJACK_ID,

      x     : building.x,
      y     : building.y,
      w     : bw,
      h     : bh,

      cx,
      cy,
      radiusTiles,

      phase     : LJ_PHASE.PLANT,
      timer     : 0,
      treeProg  : 0,
      treeAngle : rand(0, Math.PI * 2),
      treeDist  : rand(TREE_RADIUS_MIN, radiusTiles),

      workerPhase : 'toTree',
      workerTimer : 0
    };
  }

  function getOrCreateLumberjack(building){
    const uid = building.uid || building.id || LUMBERJACK_ID;
    if (Lumberjacks.has(uid)) return Lumberjacks.get(uid);

    const st = createLumberjackState(building);
    Lumberjacks.set(uid, st);
    return st;
  }

  function updateWorkArea(detail){
    const uid = detail.uid || detail.id;
    if (!uid) return;
    const lj = Lumberjacks.get(uid);
    if (!lj) return;

    lj.cx          = detail.cx ?? lj.cx;
    lj.cy          = detail.cy ?? lj.cy;
    lj.radiusTiles = detail.radiusTiles || lj.radiusTiles;

    recomputeTreePos(lj);
  }

  function recomputeTreePos(lj){
    lj.treeAngle = rand(0, Math.PI * 2);
    lj.treeDist  = rand(TREE_RADIUS_MIN, lj.radiusTiles || TREE_RADIUS_MAX_DEFAULT);
  }

  // ========================================================================
  // OUTPUT (EINZIGER GLOBALER OUTPUT)
  // ========================================================================

  function emitProdOutput(lj, item, qty){
    const bx = lj.x | 0;
    const by = lj.y | 0;
    const bw = (lj.w | 0) || 3;
    const bh = (lj.h | 0) || 3;

    const centerX = bx + bw / 2;
    const centerY = by + bh / 2;

    try{
      dispatchEvent(new CustomEvent('cb:prod:output', {
        detail:{
          bId  : lj.uid,
          uid  : lj.uid,
          kind : lj.kind,
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

  // ========================================================================
  // TICK – PRODUKTION
  // ========================================================================

  function tickLumberjack(lj, dtMs){
    lj.timer += dtMs;

    switch (lj.phase){
      case LJ_PHASE.PLANT: {
        if (lj.timer >= LJ_TIMES.PLANT){
          lj.timer = 0;
          lj.phase = LJ_PHASE.GROW;
        }
        break;
      }

      case LJ_PHASE.GROW: {
        lj.treeProg = Math.min(1, lj.treeProg + (dtMs / LJ_TIMES.GROW));
        if (lj.timer >= LJ_TIMES.GROW){
          lj.timer    = 0;
          lj.phase    = LJ_PHASE.READY;
          lj.treeProg = 1;
        }
        break;
      }

      case LJ_PHASE.READY: {
        lj.timer = 0;
        lj.phase = LJ_PHASE.CUT;
        break;
      }

      case LJ_PHASE.CUT: {
        if (lj.timer >= LJ_TIMES.CUT){
          lj.timer = 0;
          lj.phase = LJ_PHASE.PLANT;
          lj.treeProg = 0;

          const qty = 1;
          emitProdOutput(lj, 'wood', qty);

          recomputeTreePos(lj);
        }
        break;
      }

      default:
        break;
    }
  }

  function tickAllLumberjacks(dtMs){
    for (const lj of Lumberjacks.values()){
      try { tickLumberjack(lj, dtMs); }
      catch(e){ ERR('tickLumberjack Fehler', lj.uid, e); }
    }
  }

  // ========================================================================
  // TICK – WORKER-BUBBLE (lokal, rein visuell)
  // ========================================================================

  function tickWorker(lj, dtMs){
    lj.workerTimer += dtMs;

    if (lj.workerPhase === 'toTree' && lj.workerTimer >= WORKER_WALK_TIME){
      lj.workerPhase = 'atTree';
      lj.workerTimer = 0;
    } else if (lj.workerPhase === 'atTree' && lj.workerTimer >= WORKER_REST_TIME){
      lj.workerPhase = 'toHut';
      lj.workerTimer = 0;
    } else if (lj.workerPhase === 'toHut' && lj.workerTimer >= WORKER_WALK_TIME){
      lj.workerPhase = 'atHut';
      lj.workerTimer = 0;
    } else if (lj.workerPhase === 'atHut' && lj.workerTimer >= WORKER_REST_TIME){
      lj.workerPhase = 'toTree';
      lj.workerTimer = 0;
    }
  }

  function tickAllWorkers(dtMs){
    for (const lj of Lumberjacks.values()){
      try { tickWorker(lj, dtMs); }
      catch(e){ ERR('tickWorker Fehler', lj.uid, e); }
    }
  }

  // ========================================================================
  // RENDERING – BÄUME + WORKER
  // ========================================================================

  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx || !Lumberjacks.size) return;
    const ts = tileSize || 64;
    const z  = cam.zoom || 1;
    const ox = cam.x   || 0;
    const oy = cam.y   || 0;

    for (const lj of Lumberjacks.values()){
      // Baum
      const angle = lj.treeAngle;
      const dist  = lj.treeDist;

      const worldX = (lj.cx + Math.cos(angle) * dist) * ts;
      const worldY = (lj.cy + Math.sin(angle) * dist) * ts;

      const sx = (worldX - ox) * z;
      const sy = (worldY - oy) * z;

      const size = ts * z * (0.7 + 0.3 * lj.treeProg);

      ctx.save();
      ctx.fillStyle = 'rgba(0,100,0,0.9)';
      ctx.beginPath();
      ctx.arc(sx, sy - size * 0.4, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Worker-Bubble (rein visuell)
      const rWork = ts * 0.3 * z;

      let hutX = (lj.cx * ts - ox) * z;
      let hutY = (lj.cy * ts - oy) * z;

      let workerX = hutX;
      let workerY = hutY;

      if (lj.workerPhase === 'toTree'){
        workerX = (hutX + sx) / 2;
        workerY = (hutY + sy) / 2;
      } else if (lj.workerPhase === 'atTree'){
        workerX = sx;
        workerY = sy;
      } else if (lj.workerPhase === 'toHut'){
        workerX = (hutX + sx) / 2;
        workerY = (hutY + sy) / 2;
      }

      const bob = Math.sin(Date.now() / 300) * (rWork * 0.15);

      ctx.save();
      ctx.fillStyle = 'rgba(200,200,200,0.9)';
      ctx.beginPath();
      ctx.arc(workerX, workerY - ts * 0.5 + bob, rWork, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(30,30,30,0.95)';
      ctx.arc(workerX, workerY - ts * 0.8 + bob, rWork * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ========================================================================
  // EVENTS / REGISTRIERUNG
  // ========================================================================

  function onBuildComplete(detail){
    if (!detail || detail.id !== LUMBERJACK_ID) return;
    const st = getOrCreateLumberjack(detail);
    Lumberjacks.set(st.uid, st);
  }

  function onWorkAreaSet(detail){
    if (!detail) return;
    updateWorkArea(detail);
  }

  function tick(dtMs){
    tickAllLumberjacks(dtMs);
    tickAllWorkers(dtMs);
  }

  if (window.Production && typeof window.Production.registerModule === 'function'){
    window.Production.registerModule({
      id: 'wood',
      tick,
      onBuildComplete,
      onWorkAreaSet
    });
  } else {
    WARN('Production.registerModule fehlt – Holz-Modul nicht angebunden');
  }

  // ========================================================================
  // EXPORT / DEBUG
  // ========================================================================

  window.ProductionWood = {
    fields : Lumberjacks,
    drawOnMainCanvas,
    _state : { Lumberjacks }
  };

  LOG('Holz-Produktion geladen v25.12.12-wood...output-only');
})();
