/* ============================================================================
 * Datei    : core/game.js
 * Projekt  : Neue Siedler – Epoche 1
 * Version  : v19.1.0+res-bridge (2025-10-22)
 * Zweck    : Welt/Grid, Platzieren (mit Preview), Produktionsticker, Jobs, HUD-Res
 *
 * Events   :
 *   IN  :
 *     - req:place:start   {buildingId}
 *     - req:place:cursor  {tx,ty,w,h,id}
 *     - req:place:confirm {tx,ty}
 *     - req:place:cancel
 *     - req:res:snapshot                     (NEU)
 *   OUT :
 *     - cb:place:preview {tx,ty,valid}
 *     - cb:place:done    {id, tx, ty, exit}
 *     - cb:res:change    {res, delta, total}            (bestehend: HUD)
 *     - cb:res:change    {id, old, value, reason?}      (NEU: Inspector-kompatibel)
 *     - cb:res:reset                                   (optional Reset)
 *     - cb:res:snapshot { resources:{...} }            (NEU)
 *     - cb:game-start
 * ============================================================================ */

(function(root, factory){
  root.Game = factory();
})(typeof window!=='undefined'?window:this, function(){

  // ------------------------- Konstanten/State --------------------------------
  const tileSize = 32;
  const worldW = 128, worldH = 128;

  // Gemeinsamer Ressourcen-Speicher:
  // Wenn Registry bereits Werte hat, nutze die Referenz – sonst lege lokalen an.
  const sharedRes = (window.Registry?.resources) || (window.RegistryValues) || { wood:0, fish:0, stone:0 };

  const state = {
    grid: createGrid(worldW, worldH),
    buildings: [],
    units: [],
    resources: sharedRes,  // <— gemeinsame Quelle mit Registry/Inspector
    hq: null,
    jobQueue: []           // {type:'deliver', res, from:{x,y}, to:{x,y}}
  };

  // --------------------------- Helpers / Events ------------------------------
  function emit(name, detail={}){ window.dispatchEvent(new CustomEvent(name,{detail})); }
  function createGrid(w,h){
    const g = new Array(h);
    for(let y=0;y<h;y++){
      g[y] = new Array(w).fill(0); // 0 = frei, 1 = blockiert
    }
    return g;
  }
  function rectFree(tx,ty,w,h){
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      if(tx+x<0||ty+y<0||tx+x>=worldW||ty+y>=worldH) return {ok:false, reason:'Rand'};
      if(state.grid[ty+y][tx+x] !== 0) return {ok:false, reason:'Belegt'};
    }
    return {ok:true};
  }
  function occupy(tx,ty,w,h, val=1){
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      state.grid[ty+y][tx+x] = val;
    }
  }
  function getEntrance(b){
    if(b.entrances && b.entrances.length){
      const e = b.entrances[0]; // {dx,dy}
      return { x: b.tx + e.dx, y: b.ty + e.dy };
    }
    return { x: b.tx, y: b.ty + (b.size?.h||1) };
  }

  // --------------------------- Platzier-Preview ------------------------------
  window.addEventListener('req:place:cursor', (ev)=>{
    const { tx, ty, w=1, h=1, id } = ev.detail||{};
    let W=w, H=h;
    const def = (id && typeof Registry?.get==='function') ? Registry.get('buildings', id) : null;
    if (def){
      W = def?.size?.w || def?.size?.[0] || W;
      H = def?.size?.h || def?.size?.[1] || H;
    }
    const ok = rectFree(tx,ty,W,H);
    emit('cb:place:preview', { tx, ty, valid: ok.ok });
  });

  // --------------------------- Platzier-Flow ---------------------------------
  let lastRequestedBuildingId = null;

  window.addEventListener('req:place:start', (ev)=>{
    lastRequestedBuildingId = ev.detail.buildingId;
  });

  window.addEventListener('req:place:confirm', (ev)=>{
    const { tx, ty } = ev.detail||{};
    const buildingId = lastRequestedBuildingId;
    if(!buildingId) return;

    const def = Registry.get('buildings', buildingId);
    if(!def) return;

    const w = def.size?.w || def.size?.[0] || 1;
    const h = def.size?.h || def.size?.[1] || 1;

    const ok = rectFree(tx,ty,w,h);
    if(!ok.ok){
      emit('cb:place:preview', { tx, ty, valid:false });
      return;
    }

    // --- NEU: Baukosten abziehen (falls vorhanden) -------------------------
    const cost = def.cost || def.price || def.requirements?.cost || def.resources || null;
    if (cost && typeof cost==='object'){
      for (const [rid, amt] of Object.entries(cost)){
        if (!amt) continue;
        resAdd(rid, -Number(amt||0), `build:${buildingId}`);
      }
    }

    // Setzen
    occupy(tx,ty,w,h, 1);
    const inst = {
      id: buildingId,
      name: def.name||def.id,
      tx, ty, size: {w,h},
      buffer: {},            // Produktionspuffer (res → qty)
      tick: 0,
      works: !!def.produces
    };
    state.buildings.push(inst);

    const isHQ = def.role === 'hq' || buildingId === 'b.hq' || buildingId === 'hq';
    if(isHQ){
      state.hq = inst;
      const door = getEntrance(inst);
      spawnCarrier(door.x, door.y);
      spawnCarrier(door.x, door.y);
    }

    emit('cb:place:done', { id:buildingId, tx, ty, exit:false });
  });

  window.addEventListener('req:place:cancel', ()=>{
    lastRequestedBuildingId = null;
    emit('cb:place:done', { exit:true });
  });

  // --------------------------- Produktion / Jobs -----------------------------
  function gameTick(dt){
    for(const b of state.buildings){
      const def = Registry.get('buildings', b.id);
      if(!def || !def.produces) continue;

      b.tick += dt;
      const cycle = def.cycle || 3000; // ms
      if(b.tick >= cycle){
        b.tick = 0;
        def.produces.forEach(p=>{
          b.buffer[p.id] = (b.buffer[p.id]||0) + (p.qty||1);

          if(state.hq){
            const from = getEntrance(b);
            const to   = getEntrance(state.hq);
            state.jobQueue.push({
              type: 'deliver',
              res: p.id,
              qty: 1,
              from, to
            });
          }
        });
      }
    }

    // Träger arbeiten lassen
    for(const u of state.units){
      CarrierRuntime.tick(u, dt, state);
    }
  }

  // --------------------------- Träger/Units ----------------------------------
  function spawnCarrier(tx,ty){
    const u = {
      kind: 'u.carrier',
      x: tx, y: ty,
      vx:0, vy:0,
      carrying: null,   // {res, qty}
      task: null,       // {type, ...}
      path: []
    };
    state.units.push(u);
    return u;
  }

  // --------------------------- Ressourcen / Bridges --------------------------
  function emitResChangeBoth(resId, oldVal, newVal, reason){
    // 1) Bestehendes HUD-Event (dein Format) – NICHT anfassen
    emit('cb:res:change', { res: resId, delta: newVal - oldVal, total: newVal });

    // 2) Inspector-kompatibles Format (id/old/value)
    emit('cb:res:change', { id: resId, old: oldVal, value: newVal, reason });
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
    emit('cb:res:snapshot', { resources: state.resources });
  }

  // Bestehender HUD-Helfer bleibt funktionsfähig, ruft jetzt resAdd:
  function addResource(res, qty){
    resAdd(res, qty, 'deliver'); // ersetzt deine alte direkte Emission
  }

  // --------------------------- Start/Loop ------------------------------------
  let _running=false, _last=0;
  function loop(t){
    if(!_running){ _last=t; requestAnimationFrame(loop); return; }
    const dt = Math.min(50, t - _last); _last = t;
    gameTick(dt);
    requestAnimationFrame(loop);
  }

  function start(){
    _running = true;
    emit('cb:game-start', {});

    // NEU: direkt zum Start den Ressourcen-Snapshot für Inspector schicken
    emitResSnapshot();

    requestAnimationFrame(loop);
  }

  // --------------------------- Requests/Resets -------------------------------
  window.addEventListener('req:res:snapshot', emitResSnapshot);

  window.addEventListener('req:game:reset', ()=>{
    Object.keys(state.resources).forEach(k => state.resources[k] = 0);
    emit('cb:res:reset');
    emitResSnapshot();
  });

  // --------------------------- Export-API ------------------------------------
  return {
    tileSize,
    start,
    // Carrier API:
    popJob(){
      return state.jobQueue.shift() || null;
    },
    takeFromBuilding(tx,ty,res){
      const b = state.buildings.find(bb => Math.abs(getEntrance(bb).x - tx)<=1 && Math.abs(getEntrance(bb).y - ty)<=1);
      if(!b) return 0;
      const have = b.buffer[res]||0;
      if(have>0){ b.buffer[res]=have-1; return 1; }
      return 0;
    },
    deliverToHQ(res,qty){
      addResource(res, qty);
    },
    isBlocked(tx,ty){
      if(tx<0||ty<0||tx>=worldW||ty>=worldH) return true;
      return state.grid[ty][tx]!==0;
    },

    // NEU: explizite API (kannst du auch im Inspector/Tests verwenden)
    resSet,
    resAdd,
    resSnapshot: emitResSnapshot
  };
});
