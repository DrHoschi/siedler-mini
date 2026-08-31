/* ============================================================================
 * SA-05 Resident Workforce
 * Version: v26.08.31-sa05-resident1
 *
 * - u.villager remains bound to its residential home
 * - free residents can help with deliver/carry jobs when regular carriers are busy
 * - after work residents return to their own house and go inside
 * - idle residents occasionally leave the house for a short walk and return
 * - AI state is runtime-only; home binding remains SaveGame-authoritative
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa05-resident]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const SPEED=0.75;              // tiles/sec for private idle movement
  const ARRIVE=0.08;
  const TICK_MS=50;
  const STATE=new Map();          // unit id -> runtime leisure state
  let patched=false;

  function units(){return window.GameUnits?.getUnits?.()||[];}
  function isVillager(u){return !!(u&&String(u.kind||'')==='u.villager');}
  function isFreeResident(u){return isVillager(u)&&u.type==='resident'&&!u.task;}
  function homeUid(u){return u?.homeBuildingUid||u?.homeUid||null;}
  function homeBuilding(u){
    const uid=homeUid(u);if(!uid)return null;
    return (window.Game?.buildings||[]).find(b=>b&&String(b.uid)===String(uid))||null;
  }
  function entrance(b){
    if(!b)return null;
    if(Number.isFinite(Number(b.entranceTx))&&Number.isFinite(Number(b.entranceTy)))return{x:Number(b.entranceTx)+0.5,y:Number(b.entranceTy)+0.5};
    const e=Array.isArray(b.entrances)?b.entrances[0]:null;
    if(e)return{x:(Number(b.x)||0)+(Number(e.dx)||0)+0.5,y:(Number(b.y)||0)+(Number(e.dy)||0)+0.5};
    return{x:(Number(b.x)||0)+(Number(b.w)||1)/2,y:(Number(b.y)||0)+(Number(b.h)||1)+0.5};
  }
  function rnd(min,max){return min+Math.random()*(max-min);}
  function stateFor(u){
    const key=String(u.id??u.uid??Math.random());
    let s=STATE.get(key);
    if(!s){s={mode:'return',target:null,waitUntil:0,nextExit:Date.now()+rnd(7000,16000)};STATE.set(key,s);}
    return s;
  }
  function move(u,target,dt){
    if(!u||!target)return true;
    const dx=target.x-Number(u.x||0),dy=target.y-Number(u.y||0),dist=Math.hypot(dx,dy);
    if(dist<=ARRIVE){u.x=target.x;u.y=target.y;u.vx=0;u.vy=0;return true;}
    const step=SPEED*dt;
    u.vx=(dx/dist)*SPEED;u.vy=(dy/dist)*SPEED;
    if(step>=dist){u.x=target.x;u.y=target.y;u.vx=0;u.vy=0;return true;}
    u.x+=dx/dist*step;u.y+=dy/dist*step;
    try{window.UnitMovement?.updateDirFromDelta?.(u,dx,dy);}catch(_e){}
    return false;
  }
  function resetAfterWork(u){
    if(!isVillager(u)||u.type!=='carrier'||u.task)return;
    u.type='resident';u.carrying=null;u._nav=null;u._idleTarget=null;u.hidden=false;u.__animState='walk';
    const s=stateFor(u);s.mode='return';s.target=null;s.waitUntil=0;
    LOG('Bewohner Arbeit beendet → nach Hause',u.id);
  }
  function tickResident(u,dt){
    if(!isFreeResident(u))return;
    const b=homeBuilding(u),ent=entrance(b);if(!b||!ent)return;
    const s=stateFor(u),now=Date.now();

    if(s.mode==='inside'){
      u.hidden=true;u.__animState='idle';u.vx=0;u.vy=0;
      if(now>=s.nextExit){
        u.x=ent.x;u.y=ent.y;u.hidden=false;u.__animState='walk';
        const ang=Math.random()*Math.PI*2,r=rnd(0.6,1.5);
        s.target={x:ent.x+Math.cos(ang)*r,y:ent.y+Math.sin(ang)*r};
        s.mode='out';
      }
      return;
    }

    if(s.mode==='out'){
      u.hidden=false;u.__animState='walk';
      if(move(u,s.target,dt)){
        s.mode='outside-wait';s.waitUntil=now+rnd(1800,4500);u.__animState='idle';
      }
      return;
    }

    if(s.mode==='outside-wait'){
      u.hidden=false;u.__animState='idle';u.vx=0;u.vy=0;
      if(now>=s.waitUntil){s.mode='return';s.target=ent;u.__animState='walk';}
      return;
    }

    // default: return home and disappear at entrance
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
      return rawNeeds() || units().some(isFreeResident);
    };

    GU.assignJob=function(job){
      // Dedicated carriers always get first chance.
      const regular=rawAssign(job);
      if(regular!==false)return regular;

      const u=units().find(isFreeResident);
      if(!u)return false;
      const prevType=u.type;
      u.type='carrier';u.hidden=false;u.__animState='walk';u._idleTarget=null;u._nav=null;
      const ok=rawAssign(job);
      if(ok===false){u.type=prevType;return false;}
      LOG('Bewohner hilft bei Job',{unit:u.id,job:job?.id,type:job?.type});
      return ok;
    };

    GU.__sa05ResidentWorkforcePatched=true;
    patched=true;LOG('GameUnits Job-Pool um Bewohner erweitert');return true;
  }

  setInterval(()=>{
    try{if(!patched)patchJobs();}catch(e){WARN('patchJobs',e);}
    try{
      for(const u of units())resetAfterWork(u);
      const dt=TICK_MS/1000;
      for(const u of units())tickResident(u,dt);
    }catch(e){WARN('resident tick',e);}
  },TICK_MS);

  window.addEventListener('cb:savegame:v2:continue-restored',()=>{
    STATE.clear();
    setTimeout(()=>{
      for(const u of units()){
        if(!isVillager(u))continue;
        if(u.type!=='carrier')u.type='resident';
        u.hidden=false;u._idleTarget=null;
      }
    },120);
  });

  window.SA05ResidentWorkforce={version:'v26.08.31-sa05-resident1',state:STATE,patchJobs};
  LOG('bereit v26.08.31-sa05-resident1');
})();