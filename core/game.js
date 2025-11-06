/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.11.06-final (Loop+API konsolidiert)
 *
 * Zweck   : Core-Services + Game-Loop (requestAnimationFrame)
 *           Start-/Stop-API, Ressourcen-Events, einfache Job-/Block-Helper.
 *
 * Events (emit):
 *   cb:game-start / cb:game:start     – Startsignale (Bestand + neu)
 *   cb:game:tick / cb:game:frame      – pro Frame (Logik/Render)
 *   cb:game:stop                      – Loop gestoppt
 *   cb:res:change                     – Ressourcenevent (HUD/Inspector-kompatibel)
 *   cb:res:snapshot                   – kompletter Ressourcenspiegel
 *
 * Lauscht (requests):
 *   req:game:start / req:game:stop / req:game:toggle / req:game:reset
 *   req:res:snapshot
 *
 * Öffentliche API (window.Game):
 *   tileSize:number
 *   start(map?) / stop() / startLoop() / stopLoop() / isLooping:get
 *   enqueueJob(job) / popJob()
 *   takeFromBuilding(tx,ty,res) / deliverToHQ(res,qty) / isBlocked(tx,ty)
 *   resSet(id,val,reason?) / resAdd(id,delta,reason?) / resSnapshot()
 *   getResourceSnapshot(): { resources:{...} }               // Alias für Altcode
 * ============================================================================ */
(function(root,factory){ root.Game = factory(); })(typeof window!=='undefined'?window:this, function(){
  'use strict';

  /* ============================== [KONSTANTEN] ============================== */
  const TAG  = '[game/core]';
  const OK   = (...a)=> (window.CBLog?.ok    ?? console.log )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  const EVT = (n,d)=> window.dispatchEvent(new CustomEvent(n,{ detail:d }));
  const TileSize = ()=> Number(window.Game?.tileSize || window.Entities?.state?.tile || 64);

  // zentraler Ressourcenspiegel (Registry oder lokaler Fallback)
  const sharedResources =
      (window.Registry && (window.Registry.resources || window.RegistryValues))
      || { wood:0, stone:0, fish:0 };

  /* ================================= [STATE] ================================ */
  const state = {
    resources: sharedResources,
    jobs: [],
    loop: { rafId:0, running:false, last:0, t:0, fps:0, frames:0, fpsAlpha:0.12 }
  };

  /* =========================== [RESSOURCEN-API] ============================ */
  function emitResChangeBoth(resId, oldVal, newVal, reason){
    EVT('cb:res:change', { res: resId, delta: newVal - oldVal, total: newVal }); // HUD
    EVT('cb:res:change', { id: resId,  old:  oldVal, value: newVal, reason });   // Inspector
  }
  function resSet(id, value, reason='set'){
    const old = Number(state.resources[id] || 0);
    const v = Number(value||0);
    state.resources[id] = v;
    emitResChangeBoth(id, old, v, reason);
    return v;
  }
  function resAdd(id, delta, reason='add'){
    const old = Number(state.resources[id] || 0);
    const v = old + Number(delta||0);
    state.resources[id] = v;
    emitResChangeBoth(id, old, v, reason);
    return v;
  }
  function emitResSnapshot(){ EVT('cb:res:snapshot', { resources: state.resources }); }
  function getResourceSnapshot(){ return { resources: state.resources }; } // Alias für Altcode

  /* ============================= [JOB-QUEUE] =============================== */
  function enqueueJob(job){ if (!job || !job.from || !job.to || !job.res) return; state.jobs.push({ ...job }); }
  function popJob(){ return state.jobs.shift() || null; }

  /* ========================= [ENTITIES / BUILDINGS] ======================== */
  function nearestEntityAtTile(tx, ty){
    const list = window.Entities?.state?.list;
    if (!Array.isArray(list) || !list.length) return null;
    const t = TileSize(); const wx = tx*t, wy = ty*t;
    for (const b of list){
      const x0=b.x, y0=b.y, x1=b.x+b.w, y1=b.y+b.h;
      if (wx>=x0-1 && wy>=y0-1 && wx<=x1+1 && wy<=y1+1) return b;
    }
    return null;
  }
  function takeFromBuilding(tx,ty,res){
    const b = nearestEntityAtTile(tx,ty); if (!b) return 0;
    b.stock = b.stock || Object.create(null);
    const have = b.stock[res]|0; if (have>0){ b.stock[res] = have - 1; return 1; }
    return 0;
  }
  function deliverToHQ(res, qty){ resAdd(res, Number(qty||0), 'deliver'); }

  /* ============================= [BLOCKIERUNG] ============================= */
  function isBlocked(tx,ty){
    const t = TileSize();
    if (tx<0 || ty<0) return true;
    try{ // Map-Grenzen prüfen (falls MapRuntime Breite/Höhe bereitstellt)
      const m = window.MapRuntime?.map?.map;
      if (m && (tx>=m.width || ty>=m.height)) return true;
    }catch{}
    const ent = window.Entities?.state?.list || [];
    const wx = tx*t, wy = ty*t;
    for (const b of ent){ if (wx>=b.x && wy>=b.y && wx<b.x+b.w && wy<b.y+b.h) return true; }
    return false;
  }

  /* ============================== [GAME-LOOP] ============================== */
  function loopStep(nowMs){
    if (!state.loop.running) return;
    if (!state.loop.last) state.loop.last = nowMs;

    const dt = Math.max(0, (nowMs - state.loop.last) / 1000);
    state.loop.last = nowMs;
    state.loop.t   += dt;

    const instFPS = dt>0 ? (1/dt) : 0;
    state.loop.fps = state.loop.fps + state.loop.fpsAlpha * (instFPS - state.loop.fps);
    state.loop.frames++;

    const payload = { now: nowMs, t: state.loop.t, dt, fps: state.loop.fps|0 };
    EVT('cb:game:tick',  payload);   // Logik
    EVT('cb:game:frame', payload);   // Render
    state.loop.rafId = requestAnimationFrame(loopStep);
  }
  function startLoop(){ if (state.loop.running) return; state.loop.running = true; state.loop.last = 0; state.loop.rafId = requestAnimationFrame(loopStep); }
  function stopLoop(){  if (!state.loop.running) return; state.loop.running = false; if (state.loop.rafId) cancelAnimationFrame(state.loop.rafId); state.loop.rafId=0; EVT('cb:game:stop', {}); }
  Object.defineProperty(state.loop, 'isLooping', { get(){ return !!state.loop.running; } });

  /* ============================== [START/STOP] ============================= */
  function start(map){
    // tileSize ggf. aus Map übernehmen
    const ts = Number(map?.tileSize || TileSize());
    Game.tileSize = ts;

    EVT('cb:game-start', {});   // Bestand
    EVT('cb:game:start', {});   // Neuer Stil
    emitResSnapshot();          // HUD initial befüllen
    startLoop();                // Loop scharf
    OK('gestartet (tileSize=%d)', ts);
  }
  function stop(){ stopLoop(); OK('gestoppt'); }

  /* ================================ [EXPORT] ================================ */
  const Game = {
    tileSize: TileSize(),
    // Loop/Start
    start, stop, startLoop, stopLoop,
    get isLooping(){ return !!state.loop.running; },
    // Jobs
    enqueueJob, popJob,
    // Carrier/Production Hooks
    takeFromBuilding, deliverToHQ, isBlocked,
    // Ressourcen
    resSet, resAdd, resSnapshot: emitResSnapshot,
    // Kompatibler Alias (für Altcode)
    getResourceSnapshot
  };

  /* ============================== [REQUESTS] =============================== */
  window.addEventListener('req:res:snapshot', emitResSnapshot);
  window.addEventListener('req:game:reset', ()=>{
    for (const k of Object.keys(state.resources)) state.resources[k]=0;
    EVT('cb:res:reset', {}); emitResSnapshot();
  });
  window.addEventListener('req:game:start',  ()=> start());
  window.addEventListener('req:game:stop',   ()=> stop());
  window.addEventListener('req:game:toggle', ()=> { if (state.loop.running) stop(); else start(); });

  document.addEventListener('visibilitychange', ()=>{ if (document.hidden){ if (state.loop.running) stopLoop(); } else { if (!state.loop.running) startLoop(); } });

  INFO('Modul geladen – Core-Services + Loop bereit.');
  return Game;
});
