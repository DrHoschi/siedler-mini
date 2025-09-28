/* ============================================================================
 * Inspector Tests – v18.14.4
 *  - Kleine, nützliche Testhelfer mit Logs
 *  - Placeholder rufen, falls vorhanden, Game/Test-APIs auf (best effort)
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.tests]'; const VER='v18.14.4';
  const core = window.__INSPECTOR_CORE__?.api; if(!core){ console.warn(MOD,'core fehlt'); return; }

  function btn(lbl, fn){ const b=document.createElement('button'); b.className='ins-btn'; b.textContent=lbl; b.addEventListener('click', fn); return b; }
  function h2(txt){ const n=document.createElement('h3'); n.textContent=txt; return n; }
  const log=(lvl,msg)=> (window.CBLog?.[lvl]||console.log)(msg);

  core.mount('tests', ()=>{
    const host = core.getSlot('tests-view'); if (!host) return;
    host.innerHTML='';

    // --- Sektion: Pfad/Tür
    host.appendChild(h2('Pfad / Türen'));
    host.appendChild(btn('Tür-Pfad Test', ()=>{
      log('info','[tests] Tür-Pfad-Test gestartet');
      try{ window.GameTests?.doorPathTest?.(); }catch(_){}
    }));

    // --- Sektion: Transport/Carrier
    host.appendChild(h2('Transport / Carrier'));
    host.appendChild(btn('Carrier Demo (Rathaus ↔ Depot)', ()=>{
      log('info','[tests] Carrier-Demo gestartet');
      try{ window.GameTests?.carrierTownhallDepot?.(); }catch(_){}
    }));

    // --- Sektion: Engine
    host.appendChild(h2('Engine'));
    host.appendChild(btn('Engine Ping', ()=>{
      log('ok','[tests] Engine Ping ✓');
      try{ window.Game?.ping?.(); }catch(_){}
    }));
    host.appendChild(btn('Welt zurücksetzen', ()=>{
      log('warn','[tests] Welt zurücksetzen angefordert');
      try{ window.Game?.reset?.(); }catch(_){}
    }));

    console.log(MOD,'bereit',VER);
  });

})();
