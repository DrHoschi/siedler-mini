/* ============================================================================
 * Datei   : core/game.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.10.25-final
 *
 * Zweck   : Core-Services (Jobs, Ressourcen, Blockierung) für Carrier/Production/HUD
 *           – KEINE eigene Render-/Platzier-/Produktionslogik mehr
 *
 * Events  (emit):
 *   • cb:game-start           {}                // Startsignal (für Production etc.)
 *   • cb:res:change           { res, delta, total }        // HUD-kompatibel
 *   • cb:res:change           { id, old, value, reason? }  // Inspector-kompatibel
 *   • cb:res:snapshot         { resources:{...} }
 *   • cb:res:reset            {}
 *
 * Öffentliche API:
 *   Game.tileSize : number
 *   Game.start() : void
 *   Game.enqueueJob(job) : void
 *   Game.popJob() : job|null
 *   Game.takeFromBuilding(tx,ty,res) : number (0/1)
 *   Game.deliverToHQ(res,qty) : void
 *   Game.isBlocked(tx,ty) : boolean
 *   Game.resSet(id,val,reason?) / resAdd(id,delta,reason?) / resSnapshot()
 * ============================================================================ */
(function(root,factory){ root.Game = factory(); })(typeof window!=='undefined'?window:this, function(){
  'use strict';

  // ---- Logger ---------------------------------------------------------------
  const TAG  = '[game/core]';
  const OK   = (...a)=> (window.CBLog?.ok    ?? console.log )(TAG, ...a);
  const INFO = (...a)=> (window.CBLog?.info  ?? console.info)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn  ?? console.warn)(TAG, ...a);

  // ---- Helpers --------------------------------------------------------------
  const EVT = (n,d)=> window.dispatchEvent(new CustomEvent(n,{ detail:d }));
  const TileSize = ()=> Number(window.Game?.tileSize || window.Entities?.state?.tile || 64);

  // Ressourcenspeicher: gemeinsame Quelle, wenn Registry Werte hält
  const sharedResources =
      (window.Registry && (window.Registry.resources || window.RegistryValues))
      || { wood:0, stone:0, fish:0 };

  // ---- State (nur das, was Game wirklich besitzen soll) ---------------------
  const state = {
    resources: sharedResources,      // zentrale Ressourcenschicht
    jobs: [],                        // Queue für Carrier/Production
  };

  // ---- Ressourcen-Events (HUD/Inspector Bridge) ----------------------------
  function emitResChangeBoth(resId, oldVal, newVal, reason){
    EVT('cb:res:change', { res: resId, delta: newVal - oldVal, total: newVal });
    EVT('cb:res:change', { id: resId, old: oldVal, value: newVal, reason });
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

  // ---- Job-Queue ------------------------------------------------------------
  function enqueueJob(job){
    // erwartetes Format: { from:{x,y}, to:{x,y}, res }
    if (!job || !job.from || !job.to || !job.res) return;
    state.jobs.push({ ...job });
  }
  function popJob(){
    return state.jobs.shift() || null;
  }

  // ---- Gebäude-/Stock-Zugriff über Entities --------------------------------
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
    // Carrier ruft am „Eingang“ in Tiles an; wir mappen auf Entities + b.stock
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

  // ---- Blockierung (einfacher, aber wirkungsvoller Check) -------------------
  function isBlocked(tx,ty){
    const t = TileSize();
    if (tx<0 || ty<0) return true;
    // Optional: Map-Grenzen aus MapRuntime (sichtbare Karte)
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

  // ---- Start / Integrationspunkte ------------------------------------------
  function start(){
    // Normiere tileSize auf Entities/Map
    const ts = TileSize();
    Game.tileSize = ts;

    // Startsignal für andere Module (Production lauscht darauf)
    EVT('cb:game-start', {});
    // Optional gleich einen Snapshot fürs HUD/Inspector
    emitResSnapshot();

    OK('gestartet (tileSize=%d)', ts);
  }

  // ---- Exporte --------------------------------------------------------------
  const Game = {
    // Konstante/Option, von Input/Camera/Carrier genutzt:
    tileSize: TileSize(),

    start,

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

  // Requests
  window.addEventListener('req:res:snapshot', emitResSnapshot);
  window.addEventListener('req:game:reset', ()=>{
    for (const k of Object.keys(state.resources)) state.resources[k]=0;
    EVT('cb:res:reset', {});
    emitResSnapshot();
  });

  INFO('Modul geladen – Core-Services aktiv.');
  return Game;
});
