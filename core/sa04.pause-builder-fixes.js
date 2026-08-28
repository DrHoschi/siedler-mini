/* ============================================================================
 * SA-04 Pause + Builder Recovery
 * - paused local production visuals stay at/in the production building
 * - paused quarry cycle is frozen (no hidden production)
 * - fully supplied construction sites recover missing builder assignments
 * - builders approach the entrance tile instead of the building center
 * ========================================================================== */
(function(){
  'use strict';

  const TAG='[sa04-pause-builder]';
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);

  function list(){
    return Array.isArray(window.Game?.buildings) ? window.Game.buildings : [];
  }

  function byUid(uid){
    if(!uid) return null;
    return list().find(b=>b && String(b.uid)===String(uid)) || null;
  }

  function paused(b){
    return !!(b && (b.workPaused || b.__workPaused || b.paused || b.__paused));
  }

  function allMaterial(b){
    if(!b || !b.needs || typeof b.needs!=='object') return false;
    const keys=Object.keys(b.needs);
    if(!keys.length) return false;
    for(const k of keys){
      if((Number(b.delivered?.[k])||0) < (Number(b.needs[k])||0)) return false;
    }
    return true;
  }

  function entrance(b){
    if(!b) return null;
    if(Number.isFinite(Number(b.entranceTx)) && Number.isFinite(Number(b.entranceTy))){
      return {x:Number(b.entranceTx)+0.5,y:Number(b.entranceTy)+0.5};
    }
    const e=Array.isArray(b.entrances) ? b.entrances[0] : null;
    if(e){
      return {
        x:(Number(b.x)||0)+(Number(e.dx)||0)+0.5,
        y:(Number(b.y)||0)+(Number(e.dy)||0)+0.5
      };
    }
    return {
      x:(Number(b.x)||0)+(Math.max(1,Number(b.w)||1)/2),
      y:(Number(b.y)||0)+Math.max(1,Number(b.h)||1)+0.5
    };
  }

  // ------------------------------------------------------------------------
  // Pause: quarry owns its own visual worker and its own production timer.
  // Freezing only central production is not enough; keep this local state still.
  // ------------------------------------------------------------------------
  function guardStonePause(){
    const fields=window.ProductionStone?.fields;
    if(!(fields instanceof Map)) return;

    for(const [uid,field] of fields.entries()){
      const b=byUid(uid);
      if(!b) continue;

      if(paused(b)){
        if(field.__sa04PauseCycle == null){
          field.__sa04PauseCycle=Number(field.cycleMs)||0;
          LOG('Steinbruch-Worker pausiert',uid);
        }
        field.cycleMs=field.__sa04PauseCycle;
        // Visueller Steinmetz bleibt im Gebäude; außerhalb wird nichts gezeichnet.
        field.worker=null;
      } else if(field.__sa04PauseCycle != null){
        field.cycleMs=Number(field.__sa04PauseCycle)||0;
        delete field.__sa04PauseCycle;
        LOG('Steinbruch-Worker freigegeben',uid);
      }
    }
  }

  // ------------------------------------------------------------------------
  // Builder recovery.
  // The old unit code targets the building center. Use the entrance instead,
  // and re-request builders if a fully supplied site has no matching assignment.
  // ------------------------------------------------------------------------
  const lastRequest=new Map();

  function requestBuilders(b,now){
    const prev=Number(lastRequest.get(b.uid)||0);
    if(now-prev < 1200) return;
    lastRequest.set(b.uid,now);
    try{
      window.dispatchEvent(new CustomEvent('cb:build:construct:start',{detail:{
        id:b.id || b.type,
        buildingId:b.id || b.type,
        uid:b.uid,
        buildingUid:b.uid,
        x:b.x,y:b.y,w:b.w,h:b.h,
        entrances:Array.isArray(b.entrances)?b.entrances:[],
        entranceTx:b.entranceTx,
        entranceTy:b.entranceTy,
        __sa04Recovery:true
      }}));
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

      // A fully supplied site must be in the waiting-for-builder state even if
      // an older event was missed.
      if(!b.__waitingForRealBuilders && Number(b.buildPhase)===0){
        b.__waitingForRealBuilders=true;
        b.status='waiting-builders';
      }

      const matching=units.filter(u=>u?.kind==='u.builder' && u?._builderJob?.uid===b.uid);
      const ent=entrance(b);

      for(const u of matching){
        if(ent && u._builderJob && u._builderJob.phase==='toSite'){
          u._builderJob.site={x:ent.x,y:ent.y};
          if(u.task?.target){
            u.task.target.x=ent.x;
            u.task.target.y=ent.y;
          }
        }
      }

      if(b.__waitingForRealBuilders && matching.length===0){
        requestBuilders(b,now);
      }
    }
  }

  setInterval(()=>{
    try{ guardStonePause(); }catch(e){ WARN('Pause-Guard',e); }
    try{ guardBuilders(); }catch(e){ WARN('Builder-Guard',e); }
  },100);

  LOG('bereit');
})();
