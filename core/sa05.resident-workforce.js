/* ============================================================================
 * SA-05 Resident Workforce + Performance Guard
 * Version: v26.08.31-sa05-resident3-pathperf
 *
 * - u.villager remains bound to its residential home
 * - free residents can help with deliver/carry jobs when regular carriers are busy
 * - after work residents return to their own house and go inside
 * - idle residents occasionally leave the house for a short walk and return
 * - cached home lookup, single unit pass, reduced resident polling frequency
 * - PERF-02: caps live path stamps, disables expensive path halo pass,
 *   and throttles path-wear decay work without changing saved wear semantics
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa05-resident]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const SPEED=0.75;
  const ARRIVE=0.08;
  const TICK_MS=200;
  const PATH_STAMP_LIMIT=2800;
  const PATH_DECAY_STEP_SEC=0.5;
  const STATE=new Map();
  const HOME_CACHE=new Map();
  let patched=false;
  let pathPatched=false;

  function units(){return window.GameUnits?.getUnits?.()||[];}
  function isVillager(u){return !!(u&&String(u.kind||'')==='u.villager');}
  function isFreeResident(u){return isVillager(u)&&u.type==='resident'&&!u.task;}
  function homeUid(u){return u?.homeBuildingUid||u?.homeUid||null;}

  function rebuildHomeCache(){
    HOME_CACHE.clear();
    for(const b of (window.Game?.buildings||[])){
      if(b?.uid) HOME_CACHE.set(String(b.uid),b);
    }
  }
  function homeBuilding(u){
    const uid=homeUid(u);if(!uid)return null;
    const key=String(uid);
    let b=HOME_CACHE.get(key);
    if(!b){
      b=(window.Game?.buildings||[]).find(x=>x&&String(x.uid)===key)||null;
      if(b)HOME_CACHE.set(key,b);
    }
    return b;
  }
  function entrance(b){
    if(!b)return null;
    if(Number.isFinite(Number(b.entranceTx))&&Number.isFinite(Number(b.entranceTy)))return{x:Number(b.entranceTx)+0.5,y:Number(b.entranceTy)+0.5};
    const e=Array.isArray(b.entrances)?b.entrances[0]:null;
    if(e)return{x:(Number(b.x)||0)+(Number(e.dx)||0)+0.5,y:(Number(b.y)||0)+(Number(e.dy)||0)+0.5};
    return{x:(Number(b.x)||0)+(Number(b.w)||1)/2,y:(Number(b.y)||0)+(Number(b.h)||1)+0.5};
  }
  function rnd(min,max){return min+Math.random()*(max-min);}
  function stateFor(u,now){
    const key=String(u.id??u.uid??'villager');
    let s=STATE.get(key);
    if(!s){s={mode:'return',target:null,waitUntil:0,nextExit:now+rnd(7000,16000)};STATE.set(key,s);}
    return s;
  }
  function move(u,target,dt){
    if(!u||!target)return true;
    const ux=Number(u.x)||0,uy=Number(u.y)||0;
    const dx=target.x-ux,dy=target.y-uy,dist=Math.hypot(dx,dy);
    if(dist<=ARRIVE){u.x=target.x;u.y=target.y;u.vx=0;u.vy=0;return true;}
    const step=SPEED*dt;
    u.vx=(dx/dist)*SPEED;u.vy=(dy/dist)*SPEED;
    if(step>=dist){u.x=target.x;u.y=target.y;u.vx=0;u.vy=0;return true;}
    u.x=ux+dx/dist*step;u.y=uy+dy/dist*step;
    try{window.UnitMovement?.updateDirFromDelta?.(u,dx,dy);}catch(_e){}
    return false;
  }
  function resetAfterWork(u,now){
    if(!isVillager(u)||u.type!=='carrier'||u.task)return false;
    u.type='resident';u.carrying=null;u._nav=null;u._idleTarget=null;u.hidden=false;u.__animState='walk';
    const s=stateFor(u,now);s.mode='return';s.target=null;s.waitUntil=0;
    return true;
  }
  function tickResident(u,dt,now){
    if(!isFreeResident(u))return;
    const b=homeBuilding(u),ent=entrance(b);if(!b||!ent)return;
    const s=stateFor(u,now);

    if(s.mode==='inside'){
      u.hidden=true;u.__animState='idle';u.vx=0;u.vy=0;
      if(now>=s.nextExit){
        u.x=ent.x;u.y=ent.y;u.hidden=false;u.__animState='walk';
        const ang=Math.random()*Math.PI*2,r=rnd(0.6,1.5);
        s.target={x:ent.x+Math.cos(ang)*r,y:ent.y+Math.sin(ang)*r};s.mode='out';
      }
      return;
    }
    if(s.mode==='out'){
      u.hidden=false;u.__animState='walk';
      if(move(u,s.target,dt)){s.mode='outside-wait';s.waitUntil=now+rnd(1800,4500);u.__animState='idle';}
      return;
    }
    if(s.mode==='outside-wait'){
      u.hidden=false;u.__animState='idle';u.vx=0;u.vy=0;
      if(now>=s.waitUntil){s.mode='return';s.target=ent;u.__animState='walk';}
      return;
    }
    u.hidden=false;u.__animState='walk';
    if(move(u,ent,dt)){
      u.x=ent.x;u.y=ent.y;u.hidden=true;u.__animState='idle';
      s.mode='inside';s.target=null;s.nextExit=now+rnd(8000,20000);
    }
  }

  function patchJobs(){
    const GU=window.GameUnits;if(!GU||patched||typeof GU.needsJob!=='function'||typeof GU.assignJob!=='function')return false;
    const rawNeeds=GU.needsJob.bind(GU),rawAssign=GU.assignJob.bind(GU);
    GU.needsJob=function(){
      if(rawNeeds())return true;
      const list=units();
      for(let i=0;i<list.length;i++)if(isFreeResident(list[i]))return true;
      return false;
    };
    GU.assignJob=function(job){
      const regular=rawAssign(job);
      if(regular!==false)return regular;
      const list=units();let u=null;
      for(let i=0;i<list.length;i++){if(isFreeResident(list[i])){u=list[i];break;}}
      if(!u)return false;
      u.type='carrier';u.hidden=false;u.__animState='walk';u._idleTarget=null;u._nav=null;
      const ok=rawAssign(job);
      if(ok===false){u.type='resident';return false;}
      return ok;
    };
    GU.__sa05ResidentWorkforcePatched=true;patched=true;LOG('GameUnits Job-Pool um Bewohner erweitert');return true;
  }

  function patchPathPerformance(){
    const inst=window.PathOverlayInstance;
    if(!inst||pathPatched||typeof inst.drawOnMainCanvas!=='function')return false;

    const rawDraw=inst.drawOnMainCanvas.bind(inst);
    const rawDecay=typeof inst._decayWear==='function'?inst._decayWear.bind(inst):null;
    let decayAccum=0;

    if(rawDecay){
      inst._decayWear=function(dt){
        decayAccum+=Math.max(0,Number(dt)||0);
        if(decayAccum<PATH_DECAY_STEP_SEC)return;
        const run=Math.min(1,decayAccum);
        decayAccum=0;
        return rawDecay(run);
      };
    }

    inst.drawOnMainCanvas=function(ctx){
      if(Array.isArray(inst._stamps)&&inst._stamps.length>PATH_STAMP_LIMIT){
        inst._stamps=inst._stamps.slice(-PATH_STAMP_LIMIT);
      }

      // The legacy path renderer adds a second atlas draw per stamp when
      // softness is above 0.8. Temporarily clamp softness to 0.8 so every
      // visible stamp needs only one atlas draw. Width/alpha/path state stay intact.
      const oldSoft=inst.softness;
      if(Number(oldSoft)>0.8)inst.softness=0.8;
      try{return rawDraw(ctx);}
      finally{inst.softness=oldSoft;}
    };

    pathPatched=true;
    LOG('Path PERF-02 aktiv',{stampLimit:PATH_STAMP_LIMIT,decayStepSec:PATH_DECAY_STEP_SEC});
    return true;
  }

  setInterval(()=>{
    try{
      if(!patched)patchJobs();
      if(!pathPatched)patchPathPerformance();
      const list=units();
      if(!list.length)return;
      const now=Date.now(),dt=TICK_MS/1000;
      for(let i=0;i<list.length;i++){
        const u=list[i];
        if(!isVillager(u))continue;
        resetAfterWork(u,now);
        tickResident(u,dt,now);
      }
    }catch(e){WARN('resident tick',e);}
  },TICK_MS);

  window.addEventListener('cb:build:complete',rebuildHomeCache);
  window.addEventListener('cb:savegame:v2:buildings-restored',rebuildHomeCache);
  window.addEventListener('cb:game:start',()=>setTimeout(()=>{rebuildHomeCache();patchPathPerformance();},100));
  window.addEventListener('cb:map:ready',()=>setTimeout(patchPathPerformance,50));
  window.addEventListener('cb:savegame:v2:continue-restored',()=>{
    STATE.clear();rebuildHomeCache();
    setTimeout(()=>{
      const list=units();
      for(let i=0;i<list.length;i++){
        const u=list[i];if(!isVillager(u))continue;
        if(u.type!=='carrier')u.type='resident';
        u.hidden=false;u._idleTarget=null;
      }
    },120);
  });

  window.SA05ResidentWorkforce={version:'v26.08.31-sa05-resident3-pathperf',state:STATE,homeCache:HOME_CACHE,patchJobs,rebuildHomeCache,patchPathPerformance};
  LOG('bereit v26.08.31-sa05-resident3-pathperf');
})();