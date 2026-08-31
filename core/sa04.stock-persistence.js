/* ============================================================================
 * SA-04 BuildingStock Persistence
 * Version: v26.08.31-sa04-stock-save1
 * - persists physical producer stock into SaveGame V2
 * - restores quantities after Continue
 * - recreates pickup jobs from restored stock instead of persisting runtime jobs
 * ========================================================================== */
(function(){
  'use strict';

  const TAG='[sa04-stock-save]';
  const KEY='siedler.save.v2.autosave';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);

  function liveBuildings(){
    return Array.isArray(window.Game?.buildings) ? window.Game.buildings : [];
  }

  function findBuilding(uid){
    return liveBuildings().find(b=>b && String(b.uid)===String(uid)) || null;
  }

  function injectIntoStoredSave(){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw) return;
      const snap=JSON.parse(raw);
      const rows=window.BuildingStock?.snapshot?.() || [];
      snap.buildingStock=JSON.parse(JSON.stringify(rows));
      localStorage.setItem(KEY,JSON.stringify(snap));
      LOG('BuildingStock gespeichert',rows.length);
    }catch(e){
      WARN('BuildingStock speichern fehlgeschlagen',e);
    }
  }

  function clearRuntimeStock(){
    const st=window.BuildingStock?._state;
    try{ st?.STOCK?.clear?.(); }catch(_e){}
    try{ st?.OUTSTANDING?.clear?.(); }catch(_e){}
    try{ st?.JOBMETA?.clear?.(); }catch(_e){}
  }

  function restoreFromPreparedSave(){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw) return;
      const snap=JSON.parse(raw);
      const rows=Array.isArray(snap?.buildingStock)?snap.buildingStock:[];
      const BS=window.BuildingStock;
      if(!BS?.add) return;

      clearRuntimeStock();
      let restored=0;
      for(const row of rows){
        const uid=row?.bUid;
        const b=uid?findBuilding(uid):null;
        if(!b) continue;
        for(const [res,val] of Object.entries(row)){
          if(res==='bUid') continue;
          const qty=Math.max(0,Number(val)||0);
          if(qty<=0) continue;
          BS.add(b,res,qty);
          restored+=qty;
        }
      }
      LOG('BuildingStock restauriert',{rows:rows.length,qty:restored});
      try{ window.dispatchEvent(new CustomEvent('cb:stock:restored',{detail:{rows:rows.length,qty:restored}})); }catch(_e){}
    }catch(e){
      WARN('BuildingStock restore fehlgeschlagen',e);
    }
  }

  // SaveGameV2 writes the snapshot first, then emits this event. We append the
  // physical stock to that same save slot without changing SaveGameV2 core.
  window.addEventListener('cb:savegame:v2:saved',()=>injectIntoStoredSave());

  // Production rehydrate is queued as a microtask. Restore stock one macrotask
  // later so Production knows every restored producer before pickup jobs are made.
  window.addEventListener('cb:savegame:v2:continue-restored',()=>{
    setTimeout(restoreFromPreparedSave,0);
  });

  window.SA04StockPersistence={injectIntoStoredSave,restoreFromPreparedSave};
  LOG('bereit v26.08.31-sa04-stock-save1');
})();
