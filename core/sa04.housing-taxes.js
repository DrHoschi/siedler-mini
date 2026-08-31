/* ============================================================================
 * SA-04 Housing Taxes
 * Version: v26.08.31-sa04-tax1
 * - 1 gold per real resident every 10 seconds (test/balance value)
 * - credits the authoritative central gold resource through Production.addResource
 * - keeps an independent tax timer per residential building
 * - persists remaining tax time in SaveGame V2 and restores it on Continue
 * ========================================================================== */
(function(){
  'use strict';
  const TAG='[sa04-tax]';
  const SAVE_KEY='siedler.save.v2.autosave';
  const INTERVAL_MS=10000;
  const GOLD_PER_RESIDENT=1;
  const LOG=(...a)=>(window.CBLog?.ok||console.log)(TAG,...a);
  const WARN=(...a)=>(window.CBLog?.warn||console.warn)(TAG,...a);
  const STATE=new Map(); // uid -> {nextAt,lastAmount,lastCollectedAt}
  let active=false;

  function now(){return Date.now();}
  function buildings(){return Array.isArray(window.Game?.buildings)?window.Game.buildings:[];}
  function housing(){return window.SA04Housing||null;}
  function isReadyHouse(b){return !!(b&&housing()?.isHousing?.(b)&&(b.status==='done'||Number(b.buildStage)>=3));}
  function ensureState(b){
    if(!isReadyHouse(b)||!b.uid)return null;
    const uid=String(b.uid);
    let st=STATE.get(uid);
    if(!st){st={nextAt:now()+INTERVAL_MS,lastAmount:0,lastCollectedAt:0};STATE.set(uid,st);}
    return st;
  }
  function residents(b){return housing()?.residentsFor?.(b)?.length||0;}
  function expectedAmount(b){return residents(b)*GOLD_PER_RESIDENT;}
  function secondsRemaining(b){const st=ensureState(b);return st?Math.max(0,Math.ceil((st.nextAt-now())/1000)):0;}

  function collect(b,st){
    const count=residents(b);
    const amount=count*GOLD_PER_RESIDENT;
    st.lastAmount=amount;
    st.lastCollectedAt=now();
    st.nextAt=st.lastCollectedAt+INTERVAL_MS;
    if(amount<=0)return 0;
    const P=window.Production;
    if(P?.addResource){
      P.addResource('gold',amount,'housing:tax',b.uid||b.id||TAG);
    }else{
      WARN('Production.addResource fehlt; Steuer nicht gebucht');
      return 0;
    }
    try{window.dispatchEvent(new CustomEvent('cb:housing:tax-collected',{detail:{uid:b.uid,id:b.id,residents:count,amount,nextAt:st.nextAt}}));}catch(_e){}
    LOG('Steuer gebucht',{uid:b.uid,residents:count,gold:amount});
    return amount;
  }

  function tick(){
    if(!active)return;
    const t=now();
    for(const b of buildings()){
      if(!isReadyHouse(b))continue;
      const st=ensureState(b);if(!st)continue;
      if(t>=st.nextAt)collect(b,st);
    }
  }

  function snapshot(){
    const out=[];
    const t=now();
    for(const [uid,st] of STATE.entries())out.push({uid,remainingMs:Math.max(0,Number(st.nextAt)-t),lastAmount:Number(st.lastAmount)||0});
    return out;
  }
  function injectSave(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;
      const snap=JSON.parse(raw);snap.housingTaxes={intervalMs:INTERVAL_MS,goldPerResident:GOLD_PER_RESIDENT,houses:snapshot()};
      localStorage.setItem(SAVE_KEY,JSON.stringify(snap));
    }catch(e){WARN('Steuertimer speichern fehlgeschlagen',e);}
  }
  function restoreSave(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;
      const snap=JSON.parse(raw),rows=Array.isArray(snap?.housingTaxes?.houses)?snap.housingTaxes.houses:[];
      STATE.clear();const t=now();
      for(const row of rows){if(!row?.uid)continue;STATE.set(String(row.uid),{nextAt:t+Math.max(0,Number(row.remainingMs)||0),lastAmount:Number(row.lastAmount)||0,lastCollectedAt:0});}
      for(const b of buildings())ensureState(b);
      try{window.dispatchEvent(new CustomEvent('cb:housing:tax-restored',{detail:{houses:STATE.size}}));}catch(_e){}
      LOG('Steuertimer restauriert',STATE.size);
    }catch(e){WARN('Steuertimer restore fehlgeschlagen',e);}
  }

  window.addEventListener('cb:game:start',()=>{active=true;setTimeout(()=>{for(const b of buildings())ensureState(b);},300);});
  window.addEventListener('cb:build:complete',()=>setTimeout(()=>{for(const b of buildings())ensureState(b);},0));
  window.addEventListener('cb:housing:residents-changed',()=>{for(const b of buildings())ensureState(b);});
  window.addEventListener('cb:savegame:v2:saved',injectSave);
  window.addEventListener('cb:savegame:v2:continue-restored',()=>setTimeout(restoreSave,80));
  setInterval(tick,250);

  window.SA04HousingTaxes={version:'v26.08.31-sa04-tax1',INTERVAL_MS,GOLD_PER_RESIDENT,expectedAmount,secondsRemaining,snapshot,tick};
  LOG('bereit',{intervalMs:INTERVAL_MS,goldPerResident:GOLD_PER_RESIDENT});
})();