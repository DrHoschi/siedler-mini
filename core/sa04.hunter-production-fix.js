/* ============================================================================
 * SA-04 Hunter Production Fix
 * Version: v26.08.31-sa04-hunter-prod1
 * - uses the actual MapAnimals runtime state (tile coordinates)
 * - respects GameWorkArea position/radius
 * - does not consume animals while hunter building is paused
 * - emits meat/pelt through the existing cb:prod:output route
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa04-hunter-prod]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const CYCLE_MS=4500;
  const timers=new Map();

  function buildings(){
    return Array.isArray(window.Game?.buildings) ? window.Game.buildings : [];
  }

  function isFinished(b){
    return !!b && (b.status==='done' || Number(b.buildStage)>=3);
  }

  function isPaused(b){
    return !!(b && (b.workPaused || b.__workPaused || b.paused || b.__paused));
  }

  function hunterBuildings(){
    return buildings().filter(b=>b && String(b.id||b.type)==='b.hunter' && isFinished(b));
  }

  function getArea(b){
    try{
      const wa=window.GameWorkArea?.getOrCreateAreaFor?.(b);
      if(wa) return wa;
    }catch(_e){}
    return {
      cx:(Number(b.x)||0)+(Math.max(1,Number(b.w)||3)/2),
      cy:(Number(b.y)||0)+(Math.max(1,Number(b.h)||3)/2),
      radiusTiles:8
    };
  }

  function animals(){
    const arr=window.MapAnimals?._state?.animals;
    return Array.isArray(arr) ? arr : [];
  }

  function nearestAnimal(cx,cy,radius){
    const r2=radius*radius;
    let best=null, bestD2=Infinity;
    for(const a of animals()){
      if(!a || !['deer','fox'].includes(String(a.kind))) continue;
      const dx=Number(a.x)-cx, dy=Number(a.y)-cy;
      const d2=dx*dx+dy*dy;
      if(d2<=r2 && d2<bestD2){ best=a; bestD2=d2; }
    }
    return best;
  }

  function consumeAnimal(a){
    const arr=animals();
    const idx=arr.indexOf(a);
    if(idx<0) return null;
    return arr.splice(idx,1)[0] || null;
  }

  function emitOutput(b,item,qty){
    try{
      window.dispatchEvent(new CustomEvent('cb:prod:output',{detail:{
        bId:b.uid, uid:b.uid, kind:'b.hunter',
        item, qty,
        x:Number(b.x)||0, y:Number(b.y)||0,
        w:Number(b.w)||3, h:Number(b.h)||3,
        __sa04HunterProduction:true
      }}));
    }catch(e){ WARN('Output dispatch fehlgeschlagen',e); }
  }

  function runCycle(b){
    if(isPaused(b)) return false;
    const area=getArea(b);
    const cx=Number(area?.cx), cy=Number(area?.cy);
    const radius=Math.max(0.5,Number(area?.radiusTiles)||8);
    if(!Number.isFinite(cx) || !Number.isFinite(cy)) return false;

    const target=nearestAnimal(cx,cy,radius);
    if(!target) return false;
    const killed=consumeAnimal(target);
    if(!killed) return false;

    const drops=String(killed.kind)==='fox'
      ? [{item:'meat',qty:1},{item:'pelt',qty:2}]
      : [{item:'meat',qty:2},{item:'pelt',qty:1}];
    for(const d of drops) emitOutput(b,d.item,d.qty);
    LOG('Jagd erfolgreich',{building:b.uid,animal:killed.kind,drops});
    return true;
  }

  function tick(){
    const now=Date.now();
    const live=new Set();
    for(const b of hunterBuildings()){
      const uid=String(b.uid || `b.hunter@${b.x},${b.y}`);
      live.add(uid);
      if(isPaused(b)){
        // Pause freezes the production timer; no animal may disappear while paused.
        timers.set(uid,now);
        continue;
      }
      const last=Number(timers.get(uid)||now);
      if(!timers.has(uid)){ timers.set(uid,now); continue; }
      if(now-last < CYCLE_MS) continue;
      timers.set(uid,now);
      runCycle(b);
    }
    for(const uid of Array.from(timers.keys())) if(!live.has(uid)) timers.delete(uid);
  }

  setInterval(()=>{ try{ tick(); }catch(e){ WARN('tick',e); } },250);
  window.SA04HunterProduction={tick,runCycle};
  LOG('bereit v26.08.31-sa04-hunter-prod1');
})();
