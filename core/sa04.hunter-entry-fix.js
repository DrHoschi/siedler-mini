/* ============================================================================
 * SA-04 Hunter Entry Finish Guard
 * Version: v26.08.31-sa04-hunter-entry1
 * - only affects u.hunter while its b.hunter is paused
 * - if the shared pause controller has brought him into the visual entry zone,
 *   finish the transition immediately and keep him hidden inside
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa04-hunter-entry]';
  const EPS=0.38;

  function buildings(){ return Array.isArray(window.Game?.buildings)?window.Game.buildings:[]; }
  function units(){ return window.GameUnits?.getUnits?.() || []; }
  function paused(b){ return !!(b && (b.workPaused||b.__workPaused||b.paused||b.__paused)); }

  function home(u){
    const uid=u?.homeBuildingUid||u?.homeUid;
    return uid ? buildings().find(b=>b && String(b.uid)===String(uid)) || null : null;
  }

  function entry(b){
    if(Number.isFinite(Number(b?.entranceTx)) && Number.isFinite(Number(b?.entranceTy)))
      return {x:Number(b.entranceTx)+0.5,y:Number(b.entranceTy)+0.5};
    const e=Array.isArray(b?.entrances)?b.entrances[0]:null;
    if(e) return {x:(Number(b.x)||0)+(Number(e.dx)||0)+0.5,y:(Number(b.y)||0)+(Number(e.dy)||0)+0.5};
    return null;
  }

  function finish(u,e){
    u.x=e.x; u.y=e.y;
    u.hidden=true;
    u.hiddenUntil=Number.MAX_SAFE_INTEGER;
    u.task=null;
    u._nav=null;
    u.__sa04PauseHeld=true;
    const ai=u._ai||(u._ai={});
    ai.mode='sa04PauseInside';
    ai.timer=3600;
    ai.target=null;
    u.__animState='idle';
  }

  function tick(){
    for(const u of units()){
      if(!u || u.kind!=='u.hunter') continue;
      const b=home(u);
      if(!b || String(b.id||b.type)!=='b.hunter' || !paused(b)) continue;
      if(u._ai?.mode==='sa04PauseInside') continue;
      const e=entry(b); if(!e) continue;
      const d=Math.hypot((Number(u.x)||0)-e.x,(Number(u.y)||0)-e.y);
      if(d<=EPS) finish(u,e);
    }
  }

  setInterval(()=>{ try{tick();}catch(_e){} },50);
  window.SA04HunterEntryFix={tick};
  (window.CBLog?.ok||console.log)(TAG,'bereit v26.08.31-sa04-hunter-entry1');
})();
