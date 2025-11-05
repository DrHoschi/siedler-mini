/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.10.26-loop1 (vorher: v25.10.25-final)
 *
 * Zweck   : Core-Services + Game-Loop (requestAnimationFrame) für Tick-/Render-
 *           Ereignisse. Hält zentrale Ressourcenwerte, Jobs, leichte Blockerprüfung
 *           und bietet eine stabile Start/Stop-API für die restlichen Module.
 *
 * Events  (emit):
 *   • cb:game-start             {}                          // Startsignal (Alt: Bindestrich)
 *   • cb:game:start             {}                          // Startsignal (Neu: Doppelpunkt)
 *   • cb:game:tick              { now, t, dt, fps }         // Logik-Tick (pro Frame, vor Render)
 *   • cb:game:frame             { now, t, dt, fps }         // Render-Hook (optional)
 *   • cb:game:stop              {}                          // Loop gestoppt
 *   • cb:res:change             { res, delta, total }       // HUD-kompatibel
 *   • cb:res:change             { id, old, value, reason? } // Inspector-kompatibel
 *   • cb:res:snapshot           { resources:{...} }
 *   • cb:res:reset              {}
 *
 * Öffentliche API:
 *   Game.tileSize : number
 *   Game.start() : void                  // Setzt tileSize, feuert Start-Signale, startet Loop
 *   Game.stop()  : void                  // Stoppt Loop und feuert cb:game:stop
 *   Game.startLoop() / Game.stopLoop()   // Nur Loop steuern (ohne Startsignale)
 *   Game.isLooping : boolean
 *   Game.enqueueJob(job) : void
 *   Game.popJob() : job|null
 *   Game.takeFromBuilding(tx,ty,res) : number (0/1)
 *   Game.deliverToHQ(res,qty) : void
 *   Game.isBlocked(tx,ty) : boolean
 *   Game.resSet(id,val,reason?) / resAdd(id,delta,reason?) / resSnapshot()
 *
 * Requests (lauscht):
 *   • req:game:start   → Game.start()
 *   • req:game:stop    → Game.stop()
 *   • req:game:toggle  → start/stop toggeln
 *   • req:res:snapshot → cb:res:snapshot
 *   • req:game:reset   → Ressourcen auf 0, Snapshot & Reset-Event
 *
 * Hinweise:
 *   - Die Loop ist „Besitzer“ des Timings; Render-Shim kann passiv bleiben.
 *   - Wir senden sowohl „cb:game-start“ (alt) als auch „cb:game:start“ (neu),
 *     damit alter und neuer Code gleichermaßen reagieren.
 * ============================================================================ */
(function(root,factory){ root.Game = factory(); })(typeof window!=='undefined'?window:this, function(){
  'use strict';

  /* ============================== [KONSTANTEN] ============================== */
  const TAG  = '[game/core]';
  const OK   = (...a)=> (window.CBLog?.ok    ?? console.log )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  // Event-Helfer (Window-CustomEvents)
  const EVT = (n,d)=> window.dispatchEvent(new CustomEvent(n,{ detail:d }));

  // Kachelgröße aus Entities/Map ableiten (Fallback 64)
  const TileSize = ()=> Number(window.Game?.tileSize || window.Entities?.state?.tile || 64);

  // Gemeinsamer Ressourcenspeicher – bevorzugt Registry-Spiegel
  const sharedResources =
      (window.Registry && (window.Registry.resources || window.RegistryValues))
      || { wood:0, stone:0, fish:0 };

  /* ================================ [STATE] ================================= */
  const state = {
    resources: sharedResources,   // zentrale Ressourcenschicht (Map id->value)
    jobs: [],                     // Queue für Carrier/Production
    loop: {                       // Loop-/Timing-Zustand
      rafId: 0,
      running: false,
      last: 0,        // letzter Zeitstempel (ms, highres)
      t: 0,           // Spielzeit in Sekunden (akkumuliert)
      fps: 0,
      frames: 0,
      fpsAlpha: 0.12  // Glättung für FPS (exponentieller Mittelwert)
    }
  };

  /* =========================== [RESSOURCEN-API] ============================ */
  function emitResChangeBoth(resId, oldVal, newVal, reason){
    EVT('cb:res:change', { res: resId, delta: newVal - oldVal, total: newVal });     // HUD
    EVT('cb:res:change', { id: resId,  old:  oldVal, value: newVal, reason });       // Inspector
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
  function emitResSnapshot(){
    EVT('cb:res:snapshot', { resources: state.resources });
  }

  /* ============================= [JOB-QUEUE] =============================== */
  function enqueueJob(job){
    // erwartetes Format: { from:{x,y}, to:{x,y}, res }
    if (!job || !job.from || !job.to || !job.res) return;
    state.jobs.push({ ...job });
  }
  function popJob(){
    return state.jobs.shift() || null;
  }

  /* ========================= [ENTITIES / BUILDINGS] ======================== */
  function nearestEntityAtTile(tx, ty){
    const list = window.Entities?.state?.list;
    if (!Array.isArray(list) || !list.length) return null;
    const t = TileSize();
    const wx = tx * t, wy = ty * t;
    // Finde Entity, deren Box den Punkt (wx,wy) berührt (±1px Toleranz)
    for (const b of list){
      const x0=b.x, y0=b.y, x1=b.x+b.w, y1=b.y+b.h;
      if (wx>=x0-1 && wy>=y0-1 && wx<=x1+1 && wy<=y1+1) return b;
    }
    return null;
  }

  function takeFromBuilding(tx,ty,res){
    // Carrier ruft am „Eingang“ in Tiles an; Mapping auf Entities + b.stock
    const b = nearestEntityAtTile(tx,ty);
    if (!b) return 0;
    b.stock = b.stock || Object.create(null);
    const have = b.stock[res]|0;
    if (have>0){ b.stock[res] = have - 1; return 1; }
    return 0;
  }

  function deliverToHQ(res, qty){
    resAdd(res, Number(qty||0), 'deliver');
  }

  /* ============================= [BLOCKIERUNG] ============================= */
  function isBlocked(tx,ty){
    const t = TileSize();
    if (tx<0 || ty<0) return true;
    // Optional: Map-Grenzen aus MapRuntime
    try{
      const m = window.MapRuntime?.map?.map;
      if (m && (tx>=m.width || ty>=m.height)) return true;
    }catch{}
    // Block durch Gebäude (Entities)
    const ent = window.Entities?.state?.list || [];
    const wx = tx*t, wy = ty*t;
    for (const b of ent){
      if (wx>=b.x && wy>=b.y && wx<b.x+b.w && wy<b.y+b.h) return true;
    }
    return false;
  }

  /* ============================== [GAME-LOOP] ============================== */
  function loopStep(nowMs){
    if (!state.loop.running) return;                 // harte Bremse bei Stop
    if (!state.loop.last) state.loop.last = nowMs;   // init last beim ersten Frame

    const dt = Math.max(0, (nowMs - state.loop.last) / 1000);  // Sek.
    state.loop.last = nowMs;
    state.loop.t   += dt;

    // FPS (geglättet)
    const instFPS = dt>0 ? (1/dt) : 0;
    state.loop.fps = state.loop.fps + state.loop.fpsAlpha * (instFPS - state.loop.fps);
    state.loop.frames++;

    const payload = { now: nowMs, t: state.loop.t, dt, fps: state.loop.fps|0 };

    // 1) Logik-Tick (vor Render) – hier können Production/AI reagieren
    EVT('cb:game:tick', payload);

    // 2) Optionaler Render-Hook (falls jemand aktiv zeichnen will)
    EVT('cb:game:frame', payload);

    // Nächsten Frame anfordern
    state.loop.rafId = requestAnimationFrame(loopStep);
  }

  function startLoop(){
    if (state.loop.running) return;
    state.loop.running = true;
    state.loop.last = 0;
    state.loop.rafId = requestAnimationFrame(loopStep);
  }

  function stopLoop(){
    if (!state.loop.running) return;
    state.loop.running = false;
    if (state.loop.rafId) cancelAnimationFrame(state.loop.rafId);
    state.loop.rafId = 0;
    EVT('cb:game:stop', {});           // Loop-Ende signalisieren
  }

  Object.defineProperty(state.loop, 'isLooping', {
    get(){ return !!state.loop.running; }
  });

  /* ============================== [START/STOP] ============================= */
  function start(){
    // Normiere tileSize auf Entities/Map und exportiere
    const ts = TileSize();
    Game.tileSize = ts;

    // Startsignale (Alt & Neu) + initialer Snapshot für HUD/Inspector
    EVT('cb:game-start', {});          // Bindestrich (Bestandscode)
    EVT('cb:game:start', {});          // Doppelpunkt (neuer Stil)
    emitResSnapshot();

    // Loop scharf schalten
    startLoop();

    OK('gestartet (tileSize=%d)', ts);
  }

  function stop(){
    stopLoop();
    OK('gestoppt');
  }

  /* ================================ [EXPORT] ================================ */
  const Game = {
    // Konstante/Option, von Input/Camera/Carrier genutzt:
    tileSize: TileSize(),

    // Start/Stop
    start,
    stop,
    startLoop,
    stopLoop,
    get isLooping(){ return !!state.loop.running; },

    // Job-Queue API
    enqueueJob,
    popJob,

    // Carrier/Production Hooks
    takeFromBuilding,
    deliverToHQ,
    isBlocked,

    // Ressourcen
    resSet,
    resAdd,
    resSnapshot: emitResSnapshot
  };
// nach erfolgreichem JSON-Load:
window.dispatchEvent(new CustomEvent('cb:map:loaded', { detail:{ map, tileset, tileSize:32 }}));
  
  /* ============================== [REQUESTS] =============================== */
  window.addEventListener('req:res:snapshot', emitResSnapshot);

  window.addEventListener('req:game:reset', ()=>{
    for (const k of Object.keys(state.resources)) state.resources[k]=0;
    EVT('cb:res:reset', {});
    emitResSnapshot();
  });

  window.addEventListener('req:game:start',  start);
  window.addEventListener('req:game:stop',   stop);
  window.addEventListener('req:game:toggle', ()=>{
    if (state.loop.running) stop(); else start();
  });

  // Sichtbarkeitswechsel (Tab-Wechsel): Loop pausieren/fortsetzen (optional sanft)
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden) {
      if (state.loop.running) stopLoop();         // nur Loop pausieren
    } else {
      if (!state.loop.running) startLoop();       // bei Rückkehr weiterlaufen
    }
  });

  INFO('Modul geladen – Core-Services + Loop aktivierbar.');
  return Game;
});
