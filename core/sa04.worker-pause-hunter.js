/* ============================================================================
 * SA-04 Worker Pause + Hunter Worker
 * Version: v26.08.30-sa04-worker4
 * - one pause rule for real GameUnits production workers
 * - paused workers return deterministically to building entrance and stay hidden
 * - resume releases them back into the normal worker loop
 * - adds missing visible hunter worker for b.hunter
 * - rehydrates hunter runtime after Continue
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa04-worker]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const PAUSE_SPEED_TILES_PER_SEC=0.8;
  const CONTROL_DT_SEC=0.1;
  const ARRIVE_EPS=0.07;

  function buildings(){
    return Array.isArray(window.Game?.buildings) ? window.Game.buildings : [];
  }

  function findHome(u){
    const uid=u?.homeBuildingUid || u?.homeUid || null;
    if(uid){
      const b=buildings().find(x=>x && String(x.uid)===String(uid));
      if(b) return b;
    }
    const d=u?.homeDetail;
    if(d){
      return buildings().find(x=>x && String(x.id||x.type)===String(d.id||d.kind) && Number(x.x)===Number(d.x) && Number(x.y)===Number(d.y)) || null;
    }
    return null;
  }

  function isPaused(b){
    return !!(b && (b.workPaused || b.__workPaused || b.paused || b.__paused));
  }

  function entrance(b){
    if(!b) return null;
    if(Number.isFinite(Number(b.entranceTx)) && Number.isFinite(Number(b.entranceTy))){
      return {x:Number(b.entranceTx)+0.5,y:Number(b.entranceTy)+0.5};
    }
    const e=Array.isArray(b.entrances)?b.entrances[0]:null;
    if(e){
      return {x:(Number(b.x)||0)+(Number(e.dx)||0)+0.5,y:(Number(b.y)||0)+(Number(e.dy)||0)+0.5};
    }
    return {x:(Number(b.x)||0)+(Math.max(1,Number(b.w)||1)/2),y:(Number(b.y)||0)+Math.max(1,Number(b.h)||1)+0.5};
  }

  function isProductionWorker(u){
    if(!u || u.type!=='worker' || u.kind==='u.builder') return false;
    const b=findHome(u);
    if(!b) return false;
    return ['b.lumberjack','b.quarry','b.fisher','b.hunter'].includes(String(b.id||b.type||''));
  }

  function stepToEntry(u,b){
    const e=entrance(b);
    if(!e) return false;
    const ux=Number(u.x)||0, uy=Number(u.y)||0;
    const dx=e.x-ux, dy=e.y-uy;
    const dist=Math.hypot(dx,dy);
    const step=PAUSE_SPEED_TILES_PER_SEC*CONTROL_DT_SEC;

    // Important: arrival and hide must happen in the SAME control tick. The
    // previous code placed the worker exactly on the entry but returned false;
    // the legacy worker loop could then move him away again before the next
    // 100 ms tick. This was especially visible with the hunter.
    if(dist<=Math.max(ARRIVE_EPS,step)){
      u.x=e.x; u.y=e.y;
      return true;
    }

    const k=step/Math.max(dist,0.0001);
    u.x=ux+dx*k;
    u.y=uy+dy*k;
    u.hidden=false;
    u.__animState='walk';
    u.task={type:'walk',target:{x:e.x,y:e.y},__sa04PauseReturn:true};
    return false;
  }

  function holdInside(u){
    const ai=u._ai || (u._ai={});
    ai.mode='sa04PauseInside';
    ai.timer=3600;
    ai.target=null;
    u.hidden=true;
    u.hiddenUntil=Number.MAX_SAFE_INTEGER;
    u.task=null;
    u._nav=null;
    u.__animState='idle';
  }

  function controlPausedWorkers(){
    const units=window.GameUnits?.getUnits?.() || [];
    for(const u of units){
      if(!isProductionWorker(u)) continue;
      const b=findHome(u);
      if(!b) continue;
      const p=isPaused(b);
      const ai=u._ai || (u._ai={mode:'toEntrance',timer:0,target:null});

      if(p){
        if(!u.__sa04PauseHeld){
          u.__sa04PauseHeld=true;
          ai.mode='sa04PauseReturn';
          ai.target=null;
          ai.timer=0;
          u.hidden=false;
          u.hiddenUntil=0;
          u.task=null;
          u._nav=null;
          LOG('Worker kehrt wegen Pause zum Entry zurück',{worker:u.kind,building:b.uid||b.id});
        }

        if(ai.mode==='sa04PauseInside'){
          holdInside(u);
          continue;
        }
        ai.mode='sa04PauseReturn';
        ai.target=null;
        u._nav=null;
        if(stepToEntry(u,b)){
          holdInside(u);
          LOG('Worker im pausierten Gebäude angekommen',{worker:u.kind,building:b.uid||b.id});
        }
      }else if(u.__sa04PauseHeld){
        delete u.__sa04PauseHeld;
        u.hidden=false;
        u.hiddenUntil=0;
        ai.mode='inside';
        ai.timer=0;
        ai.target=null;
        u.task=null;
        u._nav=null;
        u.__animState='idle';
        LOG('Worker nach Pause freigegeben',{worker:u.kind,building:b.uid||b.id});
      }
    }
  }

  function hqSpawn(){
    const p=window.GameUnits?.getHQPos?.();
    return p && Number.isFinite(Number(p.tx)) && Number.isFinite(Number(p.ty))
      ? {tx:Number(p.tx),ty:Number(p.ty)} : {tx:0,ty:0};
  }

  function ensureHunterWorker(b){
    if(!b || String(b.id||b.type)!=='b.hunter') return null;
    if(!(b.status==='done' || Number(b.buildStage)>=3)) return null;
    const U=window.GameUnits;
    if(!U?.getUnits || !U?.spawn) return null;
    const units=U.getUnits() || [];
    const uid=b.uid || `b.hunter@${b.x},${b.y}`;
    const existing=units.find(u=>u && u.type==='worker' && String(u.homeBuildingUid||u.homeUid||'')===String(uid) && u.kind==='u.hunter');
    if(existing) return existing;

    try{ window.GameWorkArea?.getOrCreateAreaFor?.(b); }catch(_e){}
    const s=hqSpawn();
    const spawned=U.spawn('u.hunter',1,{at:s}) || [];
    const u=spawned[0];
    if(!u) return null;
    u.homeUid=uid;
    u.homeBuildingUid=uid;
    u.homeX=(Number(b.x)||0)+(Math.max(1,Number(b.w)||1)/2);
    u.homeY=(Number(b.y)||0)+(Math.max(1,Number(b.h)||1)/2);
    u.homeDetail={id:'b.hunter',uid,x:b.x,y:b.y,w:b.w,h:b.h,entrances:Array.isArray(b.entrances)?b.entrances:[]};
    u._ai={mode:'toEntrance',timer:0,target:null};
    u.hidden=false;
    u.hiddenUntil=0;
    LOG('Jäger gespawnt',uid);
    return u;
  }

  function rehydrateHunter(b){
    if(!b || String(b.id||b.type)!=='b.hunter') return;
    if(!(b.status==='done' || Number(b.buildStage)>=3)) return;
    try{
      window.dispatchEvent(new CustomEvent('cb:build:complete',{detail:{
        id:'b.hunter',kind:'b.hunter',buildingId:'b.hunter',uid:b.uid,buildingUid:b.uid,
        x:b.x,y:b.y,w:b.w,h:b.h,entrances:Array.isArray(b.entrances)?b.entrances:[],
        status:b.status,restore:true,__sa04HunterRehydrate:true
      }}));
    }catch(e){ WARN('Hunter-Rehydrate fehlgeschlagen',e); }
    ensureHunterWorker(b);
  }

  window.addEventListener('cb:build:complete',(ev)=>{
    const d=ev?.detail||{};
    if(String(d.id||d.kind)!=='b.hunter') return;
    queueMicrotask(()=>{
      const b=buildings().find(x=>x && String(x.uid)===String(d.uid||d.buildingUid)) || d;
      ensureHunterWorker(b);
    });
  });

  window.addEventListener('cb:savegame:v2:continue-restored',()=>{
    queueMicrotask(()=>{
      for(const b of buildings()) rehydrateHunter(b);
      controlPausedWorkers();
    });
  });

  setInterval(()=>{
    try{ controlPausedWorkers(); }catch(e){ WARN('Pause-Control',e); }
    try{ for(const b of buildings()) ensureHunterWorker(b); }catch(e){ WARN('Hunter-Control',e); }
  },100);

  window.SA04WorkerControl={controlPausedWorkers,ensureHunterWorker};
  LOG('bereit v26.08.30-sa04-worker4');
})();
