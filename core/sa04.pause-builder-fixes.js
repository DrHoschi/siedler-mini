/* ============================================================================
 * SA-04 Pause + Builder Recovery
 * - paused quarry worker returns to entry and disappears there
 * - paused local quarry cycle is frozen (no hidden production)
 * - pause state is appended to SaveGame V2 buildings and survives Continue
 * - fully supplied construction sites recover missing builder assignments
 * - mid-build Continue preserves elapsed progress but requires builders again
 * - builders approach the entrance tile instead of the building center
 * ========================================================================== */
(function(){
  'use strict';

  const TAG='[sa04-pause-builder]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const SAVE_KEY='siedler.save.v2.autosave';
  const RETURN_MS=1400;
  const PHASE_SITE=0, PHASE_BUILD=1;

  function list(){ return Array.isArray(window.Game?.buildings) ? window.Game.buildings : []; }
  function byUid(uid){ if(!uid) return null; return list().find(b=>b && String(b.uid)===String(uid)) || null; }
  function paused(b){ return !!(b && (b.workPaused || b.__workPaused || b.paused || b.__paused)); }
  function allMaterial(b){
    if(!b || !b.needs || typeof b.needs!=='object') return false;
    const keys=Object.keys(b.needs); if(!keys.length) return false;
    for(const k of keys){ if((Number(b.delivered?.[k])||0) < (Number(b.needs[k])||0)) return false; }
    return true;
  }
  function entrance(b){
    if(!b) return null;
    if(Number.isFinite(Number(b.entranceTx)) && Number.isFinite(Number(b.entranceTy))) return {x:Number(b.entranceTx)+0.5,y:Number(b.entranceTy)+0.5};
    const e=Array.isArray(b.entrances) ? b.entrances[0] : null;
    if(e) return {x:(Number(b.x)||0)+(Number(e.dx)||0)+0.5,y:(Number(b.y)||0)+(Number(e.dy)||0)+0.5};
    return {x:(Number(b.x)||0)+(Math.max(1,Number(b.w)||1)/2),y:(Number(b.y)||0)+Math.max(1,Number(b.h)||1)+0.5};
  }

  window.addEventListener('cb:savegame:v2:saved',()=>{
    try{
      const raw=localStorage.getItem(SAVE_KEY); if(!raw) return;
      const snap=JSON.parse(raw); if(!Array.isArray(snap.buildings)) return;
      const live=new Map(list().filter(Boolean).map(b=>[String(b.uid||''),b]));
      for(const sb of snap.buildings){ const b=live.get(String(sb?.uid||'')); if(b) sb.workPaused=!!b.workPaused; }
      localStorage.setItem(SAVE_KEY,JSON.stringify(snap)); LOG('Pause-State gespeichert');
    }catch(e){ WARN('Pause-State Save fehlgeschlagen',e); }
  });

  function currentWorkerPos(field){
    const w=field?.worker; if(!w) return null; const t=Math.max(0,Math.min(1,Number(w.tNorm)||0));
    return {x:(Number(w.fromTx)||0)+((Number(w.toTx)||0)-(Number(w.fromTx)||0))*t,y:(Number(w.fromTy)||0)+((Number(w.toTy)||0)-(Number(w.fromTy)||0))*t};
  }
  function beginReturn(field,b){
    const ent=entrance(b); if(!ent) return;
    const cur=currentWorkerPos(field) || {x:(Number(field?.cx)||((Number(b.x)||0)+(Number(b.w)||1)/2)),y:(Number(field?.cy)||((Number(b.y)||0)+(Number(b.h)||1)/2))};
    field.worker={tMs:0,fromTx:cur.x,fromTy:cur.y,toTx:ent.x,toTy:ent.y,tNorm:0,__sa04ReturnToEntry:true};
    field.__sa04ReturnStartedAt=performance.now ? performance.now() : Date.now();
    LOG('Steinmetz läuft zum Entry zurück',b.uid);
  }
  function guardStonePause(){
    const fields=window.ProductionStone?.fields; if(!(fields instanceof Map)) return;
    const now=performance.now ? performance.now() : Date.now();
    for(const [uid,field] of fields.entries()){
      const b=byUid(uid); if(!b) continue;
      if(paused(b)){
        if(field.__sa04PauseCycle == null){ field.__sa04PauseCycle=Number(field.cycleMs)||0; beginReturn(field,b); }
        field.cycleMs=Number(field.__sa04PauseCycle)||0;
        const w=field.worker;
        if(w?.__sa04ReturnToEntry){
          const start=Number(field.__sa04ReturnStartedAt)||now; const t=Math.max(0,Math.min(1,(now-start)/RETURN_MS));
          w.tNorm=t; w.tMs=t*2800;
          if(t>=1){ field.worker=null; field.__sa04WorkerInside=true; LOG('Steinmetz am Entry → im Gebäude',uid); }
        } else if(field.__sa04WorkerInside){ field.worker=null; }
        else if(!w){ field.__sa04WorkerInside=true; }
      } else if(field.__sa04PauseCycle != null){
        field.cycleMs=Number(field.__sa04PauseCycle)||0; delete field.__sa04PauseCycle; delete field.__sa04ReturnStartedAt; delete field.__sa04WorkerInside;
        if(field.worker?.__sa04ReturnToEntry) field.worker=null; LOG('Steinbruch-Worker freigegeben',uid);
      }
    }
  }

  const lastRequest=new Map();
  function requestBuilders(b,now){
    const prev=Number(lastRequest.get(b.uid)||0); if(now-prev < 1200) return;
    lastRequest.set(b.uid,now);
    try{
      window.dispatchEvent(new CustomEvent('cb:build:construct:start',{detail:{id:b.id || b.type,buildingId:b.id || b.type,uid:b.uid,buildingUid:b.uid,x:b.x,y:b.y,w:b.w,h:b.h,entrances:Array.isArray(b.entrances)?b.entrances:[],entranceTx:b.entranceTx,entranceTy:b.entranceTy,__sa04Recovery:true}}));
      LOG('Builder erneut angefordert',b.uid||b.id);
    }catch(e){ WARN('Builder-Recovery Event fehlgeschlagen',e); }
  }

  function guardBuilders(){
    const units=window.GameUnits?.getUnits?.() || [];
    const now=performance.now ? performance.now() : Date.now();

    for(const b of list()){
      if(!b || b.id==='b.hq') continue;
      if(b.status==='done' || Number(b.buildStage)>=3 || Number(b.buildPhase)>=2) continue;
      if(!allMaterial(b)) continue;

      const matching=units.filter(u=>u?.kind==='u.builder' && u?._builderJob?.uid===b.uid);
      const ent=entrance(b);
      for(const u of matching){
        if(ent && u._builderJob && u._builderJob.phase==='toSite'){
          u._builderJob.site={x:ent.x,y:ent.y};
          if(u.task?.target){ u.task.target.x=ent.x; u.task.target.y=ent.y; }
        }
      }

      // Continue can restore a BUILD-phase building while intentionally stripping
      // transient _builderJob from units. In that case pause construction again,
      // preserve elapsed/progress, and request real builders before resuming.
      if(matching.length===0 && (Number(b.buildPhase)===PHASE_SITE || Number(b.buildPhase)===PHASE_BUILD)){
        b.__waitingForRealBuilders=true;
        b.status='waiting-builders';
        requestBuilders(b,now);
      }
    }
  }

  setInterval(()=>{
    try{ guardStonePause(); }catch(e){ WARN('Pause-Guard',e); }
    try{ guardBuilders(); }catch(e){ WARN('Builder-Guard',e); }
  },50);

  LOG('bereit v26.08.31-sa04-builder-recovery2');
})();