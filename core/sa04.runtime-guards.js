/* ============================================================================
 * Datei   : core/sa04.runtime-guards.js
 * Projekt : Neue Siedler
 * Version : v26.08.28-sa04-runtime-guards1
 * Zweck   : Enger SA-04-Kompatibilitätslayer für Restore-/Runtime-Lücken.
 *
 * - hält Buildings.list und Game.buildings nach Restore auf EINER Liste
 * - persistiert PathOverlay-Wear + sichtbare Stamps additiv im V2-Autosave
 * - Construction wartet nach vollständiger Materiallieferung auf echte Builder
 * - verwirft/stoppt überzählige Baustellen-Lieferjobs
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa04-guards]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const SAVE_KEY='siedler.save.v2.autosave';
  const PHASE_SITE=0, PHASE_BUILD=1;

  function buildings(){
    return Array.isArray(window.Game?.buildings) ? window.Game.buildings : [];
  }
  function findBuilding(uid,id){
    const list=buildings();
    return (uid && list.find(b=>b&&b.uid===uid)) || (id && list.find(b=>b&&b.id===id)) || null;
  }
  function allMaterial(b){
    if(!b||!b.needs) return false;
    for(const [res,n] of Object.entries(b.needs)){
      if((Number(b.delivered?.[res])||0) < (Number(n)||0)) return false;
    }
    return true;
  }
  function remainingNeed(b,res){
    if(!b) return 0;
    return Math.max(0,(Number(b.needs?.[res])||0)-(Number(b.delivered?.[res])||0));
  }

  // ------------------------------------------------------------------------
  // 1) Restore: genau eine Gebäudeliste.
  // Pause-UI arbeitet über Buildings.list, Construction/Renderer über Game.buildings.
  // ------------------------------------------------------------------------
  window.addEventListener('cb:savegame:v2:buildings-restored',()=>{
    try{
      if(!window.Buildings || !Array.isArray(window.Buildings.list) || !window.Game) return;
      const restored=Array.isArray(window.Game.buildings) ? window.Game.buildings.slice() : [];
      window.Buildings.list.length=0;
      window.Buildings.list.push(...restored);
      window.Game.buildings=window.Buildings.list;
      for(const b of window.Buildings.list){
        try{ window.Buildings.ensureSprite?.(b); }catch(_e){}
      }
      LOG('Gebäudelisten nach Restore synchronisiert',window.Buildings.list.length);
    }catch(e){ WARN('building sync fehlgeschlagen',e); }
  });

  // ------------------------------------------------------------------------
  // 2) Trampelpfade additiv in denselben V2-Autosave hängen.
  // bornSec ist performance-relative; gespeichert wird deshalb das Alter.
  // ------------------------------------------------------------------------
  window.addEventListener('cb:savegame:v2:saved',()=>{
    try{
      const inst=window.PathOverlayInstance;
      if(!inst) return;
      const raw=localStorage.getItem(SAVE_KEY);
      if(!raw) return;
      const snap=JSON.parse(raw);
      const now=(performance.now?performance.now():Date.now())/1000;
      snap.paths={
        wear:Array.from(inst._wear instanceof Map ? inst._wear.entries() : []),
        stamps:(Array.isArray(inst._stamps)?inst._stamps:[]).map(s=>({
          xPx:Number(s.xPx)||0,
          yPx:Number(s.yPx)||0,
          frame:s.frame||null,
          terrain:s.terrain||'DEFAULT',
          stage:Number(s.stage)||0,
          ageSec:Math.max(0,now-(Number(s.bornSec)||now))
        }))
      };
      localStorage.setItem(SAVE_KEY,JSON.stringify(snap));
      LOG('Path-State gespeichert',{wear:snap.paths.wear.length,stamps:snap.paths.stamps.length});
    }catch(e){ WARN('Path-Save fehlgeschlagen',e); }
  });

  function restorePaths(){
    try{
      const inst=window.PathOverlayInstance;
      if(!inst) return false;
      const raw=localStorage.getItem(SAVE_KEY);
      if(!raw) return true;
      const snap=JSON.parse(raw);
      const p=snap?.paths;
      if(!p) return true;
      inst._wear.clear();
      for(const pair of (Array.isArray(p.wear)?p.wear:[])){
        if(Array.isArray(pair)&&pair.length>=2) inst._wear.set(pair[0],Number(pair[1])||0);
      }
      const now=(performance.now?performance.now():Date.now())/1000;
      inst._stamps=(Array.isArray(p.stamps)?p.stamps:[]).map(s=>({
        xPx:Number(s.xPx)||0,
        yPx:Number(s.yPx)||0,
        frame:s.frame||null,
        terrain:s.terrain||'DEFAULT',
        stage:Number(s.stage)||0,
        bornSec:now-Math.max(0,Number(s.ageSec)||0)
      }));
      try{ inst._emitState?.(); }catch(_e){}
      LOG('Path-State restauriert',{wear:inst._wear.size,stamps:inst._stamps.length});
      return true;
    }catch(e){ WARN('Path-Restore fehlgeschlagen',e); return true; }
  }
  window.addEventListener('cb:savegame:v2:continue-restored',()=>{
    if(!restorePaths()) setTimeout(restorePaths,250);
  });

  // ------------------------------------------------------------------------
  // 3) Letzte Materiallieferung startet Builder-Anfahrt, NICHT die Bauzeit.
  // Das Legacy-Construction-Modul setzt vorher bereits BUILD und emittiert
  // cb:build:construct:start. Wir setzen unmittelbar danach auf WAIT zurück.
  // ------------------------------------------------------------------------
  window.addEventListener('cb:build:construct:start',(ev)=>{
    try{
      const d=ev?.detail||{};
      const b=findBuilding(d.uid||d.buildingUid,d.id||d.buildingId);
      if(!b || b.id==='b.hq') return;
      b.__waitingForRealBuilders=true;
      b.buildPhase=PHASE_SITE;
      b.buildElapsed=Number(b.buildElapsed)||0;
      b.buildProgress=Number(b.buildProgress)||0;
      b.buildStage=0;
      b.buildSubStage=0;
      b.status='waiting-builders';
      LOG('Baustelle wartet auf Builder',b.uid||b.id);
    }catch(e){ WARN('builder wait guard',e); }
  });

  // GameUnits hat keinen Arrival-Event. Enger Poll nur für wartende Baustellen:
  // sobald ein zugeordneter u.builder tatsächlich phase=working erreicht,
  // darf Construction in BUILD wechseln.
  setInterval(()=>{
    try{
      const units=window.GameUnits?.getUnits?.()||[];
      for(const b of buildings()){
        if(!b?.__waitingForRealBuilders || !allMaterial(b)) continue;
        const uid=b.uid;
        const arrived=units.some(u=>u?.kind==='u.builder' && u?._builderJob?.uid===uid && u._builderJob.phase==='working');
        if(!arrived) continue;
        b.__waitingForRealBuilders=false;
        b.buildPhase=PHASE_BUILD;
        b.buildElapsed=Number(b.buildElapsed)||0;
        b.buildProgress=Math.max(0,Number(b.buildProgress)||0);
        b.buildSubStage=1;
        b.buildStage=1;
        b.status='building';
        LOG('Builder angekommen → Bau startet',uid||b.id);
      }
    }catch(_e){}
  },100);

  // ------------------------------------------------------------------------
  // 4) Keine Überlieferung und keine neuen überzähligen Deliver-Jobs.
  // Nach jeder echten Lieferung Werte auf needs deckeln und bereits unterwegs
  // befindliche identische Carrier-Aufträge abbrechen, sobald Bedarf 0 ist.
  // ------------------------------------------------------------------------
  window.addEventListener('cb:build:deliver',(ev)=>{
    queueMicrotask(()=>{
      try{
        const d=ev?.detail||{};
        const b=findBuilding(d.buildingUid,d.buildingId);
        const res=String(d.res||'');
        if(!b||!res) return;
        const need=Math.max(0,Number(b.needs?.[res])||0);
        const have=Math.max(0,Number(b.delivered?.[res])||0);
        if(have>need) b.delivered[res]=need;
        if(remainingNeed(b,res)>0) return;

        const units=window.GameUnits?.getUnits?.()||[];
        let cancelled=0;
        for(const u of units){
          const t=u?.task;
          const j=t?.job;
          if(!t||!j||String(j.type)!=='deliver') continue;
          const sameB=(j.buildingUid&&j.buildingUid===b.uid)||(t.buildingUid&&t.buildingUid===b.uid);
          if(!sameB || String(j.res)!==res) continue;
          u.task=null; u.carrying=null; u._nav=null; cancelled++;
        }
        if(cancelled) LOG('überzählige laufende Lieferungen abgebrochen',{uid:b.uid,res,cancelled});
      }catch(e){ WARN('delivery clamp',e); }
    });
  });

  function wrapJobEngine(){
    const eng=window.JobEngine;
    if(!eng||eng.__sa04PopWrapped||typeof eng.pop!=='function') return false;
    const rawPop=eng.pop.bind(eng);
    eng.pop=function(){
      for(let guard=0;guard<100;guard++){
        const job=rawPop();
        if(!job) return null;
        if(String(job.type)!=='deliver') return job;
        const b=findBuilding(job.buildingUid,job.buildingId);
        if(!b) return job;
        if(remainingNeed(b,String(job.res))>0) return job;
        LOG('überzähliger Queue-Lieferjob verworfen',job.id);
      }
      return null;
    };
    eng.__sa04PopWrapped=true;
    LOG('JobEngine.pop Guard aktiv');
    return true;
  }
  const wrapTimer=setInterval(()=>{ if(wrapJobEngine()) clearInterval(wrapTimer); },50);

  LOG('Runtime-Guards geladen');
})();
