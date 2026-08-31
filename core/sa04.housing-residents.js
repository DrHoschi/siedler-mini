/* ============================================================================
 * SA-04 Housing Residents
 * Version: v26.08.31-sa04-housing1
 * - reads housing capacity/spawns from building registry
 * - creates real u.villager units for completed residential buildings
 * - binds every resident to a stable home building UID
 * - deduplicates on reload/rehydration
 * - exposes resident/capacity queries for the building menu and later taxes
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa04-housing]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);

  function defFor(id){
    try{return window.Registry?.getBuilding?.(id)||window.Registry?.get?.('buildings',id)||null;}catch(_e){return null;}
  }
  function isHousing(b){
    if(!b)return false;
    const d=defFor(b.id||b.type||'');
    return String(d?.category||b.category||'')==='housing';
  }
  function capacityFor(b){
    if(!b)return 0;
    const d=defFor(b.id||b.type||'');
    const sp=Array.isArray(d?.spawns)?d.spawns:[];
    let n=0;
    for(const x of sp){
      const id=String(x?.unit||x?.id||'').toLowerCase();
      if(id==='u.villager'||id==='villager') n+=Math.max(0,Number(x?.qty)||0);
    }
    return n|0;
  }
  function homeUidOf(u){return u?.homeBuildingUid||u?.homeUid||null;}
  function residentsFor(bOrUid){
    const uid=typeof bOrUid==='string'?bOrUid:(bOrUid?.uid||bOrUid?.buildingUid||null);
    if(!uid)return [];
    const list=window.GameUnits?.getUnits?.()||window.Game?.units||[];
    return (Array.isArray(list)?list:[]).filter(u=>u&&String(u.kind||'')==='u.villager'&&String(homeUidOf(u)||'')===String(uid));
  }
  function entranceOf(b){
    if(Number.isFinite(Number(b?.entranceTx))&&Number.isFinite(Number(b?.entranceTy))) return {tx:Number(b.entranceTx)+0.5,ty:Number(b.entranceTy)+0.5};
    const e=Array.isArray(b?.entrances)?b.entrances[0]:null;
    if(e)return {tx:(Number(b.x)||0)+(Number(e.dx)||0)+0.5,ty:(Number(b.y)||0)+(Number(e.dy)||0)+0.5};
    return {tx:(Number(b?.x)||0)+(Number(b?.w)||1)/2,ty:(Number(b?.y)||0)+(Number(b?.h)||1)};
  }
  function ensureResidents(b){
    if(!b||!isHousing(b))return 0;
    if(!(b.status==='done'||Number(b.buildStage)>=3))return 0;
    const cap=capacityFor(b); if(cap<=0)return 0;
    const existing=residentsFor(b);
    const missing=Math.max(0,cap-existing.length); if(!missing)return 0;
    const U=window.GameUnits; if(!U?.spawn)return 0;
    const ent=entranceOf(b);
    const spawned=U.spawn('u.villager',missing,{at:ent})||[];
    for(const u of spawned){
      u.type='resident';
      u.kind='u.villager';
      u.homeUid=b.uid;
      u.homeBuildingUid=b.uid;
      u.homeX=(Number(b.x)||0)+(Number(b.w)||1)/2;
      u.homeY=(Number(b.y)||0)+(Number(b.h)||1)/2;
      u.homeDetail={id:b.id,uid:b.uid,x:b.x,y:b.y,w:b.w,h:b.h};
      u.task=null;u._nav=null;u._idleTarget=null;
    }
    try{window.dispatchEvent(new CustomEvent('cb:housing:residents-changed',{detail:{uid:b.uid,id:b.id,residents:residentsFor(b).length,capacity:cap}}));}catch(_e){}
    LOG('Bewohner angelegt',{uid:b.uid,id:b.id,added:spawned.length,residents:residentsFor(b).length,capacity:cap});
    return spawned.length;
  }
  function findBuilding(d){
    const list=window.Game?.buildings||[];
    const uid=d?.uid||d?.buildingUid||null;
    if(uid){const b=list.find(x=>x&&String(x.uid)===String(uid));if(b)return b;}
    const id=String(d?.id||d?.buildingId||'');
    return list.find(x=>x&&x.id===id&&Number(x.x)===Number(d?.x)&&Number(x.y)===Number(d?.y))||null;
  }
  function ensureAll(){let added=0;for(const b of(window.Game?.buildings||[]))added+=ensureResidents(b);return added;}

  window.addEventListener('cb:build:complete',ev=>{const b=findBuilding(ev?.detail||{});if(b)queueMicrotask(()=>ensureResidents(b));});
  window.addEventListener('cb:savegame:v2:continue-restored',()=>setTimeout(ensureAll,50));
  window.addEventListener('cb:game:start',()=>setTimeout(ensureAll,250));

  window.SA04Housing={version:'v26.08.31-sa04-housing1',isHousing,capacityFor,residentsFor,ensureResidents,ensureAll};
  LOG('bereit v26.08.31-sa04-housing1');
})();