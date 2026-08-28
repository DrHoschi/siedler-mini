/* ============================================================================
 * SA-04 Production Bridge
 * - rehydrates finished production buildings after Continue
 * - routes stockable production output exclusively through BuildingStock
 * - prevents legacy duplicate resource credit + duplicate carry jobs
 * - suppresses obsolete type:'build' jobs created by cb:build:complete replay
 * - blocks production output while the live building is paused
 * ========================================================================== */
(function(){
  'use strict';

  const TAG='[sa04-production]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);

  const STOCKABLE = new Set(['b.lumberjack','b.quarry','b.fisher']);

  function getBuilding(uid, kind, d){
    const list=window.Game?.buildings || window.Buildings?.list || [];
    let b=null;
    if (uid) b=list.find(x=>x && String(x.uid)===String(uid)) || null;
    if (!b && kind && Number.isFinite(Number(d?.x)) && Number.isFinite(Number(d?.y))){
      b=list.find(x=>x && x.id===kind && Number(x.x)===Number(d.x) && Number(x.y)===Number(d.y)) || null;
    }
    if (b) return b;
    if (!kind) return null;
    return {
      uid:uid || `${kind}@${d?.x||0},${d?.y||0}`,
      id:kind, kind,
      x:Number(d?.x)||0, y:Number(d?.y)||0,
      w:Number(d?.w)||1, h:Number(d?.h)||1,
      entrances:Array.isArray(d?.entrances)?d.entrances:[]
    };
  }

  function isPaused(b){
    return !!(b && (b.workPaused || b.__workPaused || b.paused || b.__paused));
  }

  function isStockable(kind){
    const BS=window.BuildingStock;
    if (BS && typeof BS.isKindStockable==='function'){
      try { return !!BS.isKindStockable(kind); } catch(_) {}
    }
    return STOCKABLE.has(String(kind||''));
  }

  // Capture listener: for every production output resolve the live building first.
  // Paused buildings must not create stock/resources/jobs through any legacy path.
  window.addEventListener('cb:prod:output',(ev)=>{
    const d=ev?.detail || {};
    const kind=String(d.kind || d.buildingKind || d.id || '');
    const uid=d.bId || d.uid || null;
    const b=getBuilding(uid,kind,d);

    if (b && isPaused(b)){
      ev.stopImmediatePropagation();
      LOG('Output unterdrückt: Gebäude pausiert',{uid:b.uid,kind});
      return;
    }

    if (!isStockable(kind)) return;

    const BS=window.BuildingStock;
    if (!BS || typeof BS.add!=='function' || (BS.isEnabled && !BS.isEnabled())) return;

    const item=String(d.item || d.res || d.resource || '').replace(/^res\./,'');
    const qty=Math.max(1,Number(d.qty)||1);
    if (!b || !item) return;

    try{
      ev.stopImmediatePropagation();
      BS.add(b,item,qty);
      LOG('Output → BuildingStock', {uid:b.uid,kind,item,qty});
    }catch(e){
      WARN('Stock route fehlgeschlagen',e);
    }
  }, true);

  function detailFromBuilding(b){
    return {
      id:b.id || b.type,
      kind:b.id || b.type,
      buildingId:b.id || b.type,
      uid:b.uid,
      buildingUid:b.uid,
      x:b.x,y:b.y,w:b.w,h:b.h,
      entrances:Array.isArray(b.entrances)?b.entrances:[],
      entranceTx:b.entranceTx,
      entranceTy:b.entranceTy,
      dropTx:b.dropTx,
      dropTy:b.dropTy,
      status:b.status,
      workPaused:!!b.workPaused,
      restore:true,
      __sa04ProductionRehydrate:true
    };
  }

  function rehydrateProduction(){
    const list=window.Game?.buildings || [];
    let count=0;
    for (const b of list){
      if (!b) continue;
      const kind=String(b.id || b.type || '');
      if (!isStockable(kind)) continue;
      if (!(b.status==='done' || Number(b.buildStage)>=3)) continue;
      try{
        window.dispatchEvent(new CustomEvent('cb:build:complete',{detail:detailFromBuilding(b)}));
        count++;
      }catch(e){ WARN('Rehydrate fehlgeschlagen',kind,b.uid,e); }
    }
    LOG('Production rehydrated',count);
  }

  // The old JobEngine generates three type:'build' wood jobs for EVERY
  // cb:build:complete. Those are not construction-delivery jobs and must never
  // run during a restore replay. Wrap pop after all other SA-04 wrappers exist.
  function wrapLegacyBuildFilter(){
    const eng=window.JobEngine;
    if(!eng || eng.__sa04LegacyBuildFiltered || typeof eng.pop!=='function') return false;
    const rawPop=eng.pop.bind(eng);
    eng.pop=function(){
      for(let i=0;i<100;i++){
        const job=rawPop();
        if(!job) return null;
        if(String(job.type)==='build'){
          LOG('Legacy build job verworfen',job.id);
          continue;
        }
        return job;
      }
      return null;
    };
    eng.__sa04LegacyBuildFiltered=true;
    LOG('Legacy type:build Filter aktiv');
    return true;
  }
  const filterTimer=setInterval(()=>{ if(wrapLegacyBuildFilter()) clearInterval(filterTimer); },100);

  window.addEventListener('cb:savegame:v2:continue-restored',()=>{
    queueMicrotask(rehydrateProduction);
  });

  window.SA04ProductionBridge={rehydrateProduction};
  LOG('bereit');
})();
