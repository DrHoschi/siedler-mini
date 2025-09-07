/* ============================================================================
 * Inspector Tests – v18.12.3
 * - Zwei echte Helfer:
 *   1) Tür/Pathfinding-Check  -> Game.Tests?.doorsCheck() oder Heuristik
 *   2) Carrier-Pendler-Route  -> Game.Tests?.spawnCarrierRoute(fromId,toId)
 * - Alles loggt ins Logs-Tab via CBLog/console.*
 * ========================================================================== */
(function(){
  'use strict';
  const core = window.__INSPECTOR_CORE__; if (!core?.api) return;
  const MOD='[inspector.tests]';
  const log=(...a)=>(window.CBLog?.ok||console.log)(MOD,...a);
  const warn=(...a)=>(window.CBLog?.warn||console.warn)(MOD,...a);

  function el(tag,cls,html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  core.api.mount('tests', ()=>{
    const host = core.api.getSlot('tests'); if (!host) return;
    host.innerHTML='';

    // Controls
    const box = el('div','ins-controls');
    const runDoors = el('button','ins-btn','Tür/Pathfinding prüfen');
    const fromIn  = el('input','ins-search'); fromIn.placeholder='From-ID (z.B. rathaus)';
    const toIn    = el('input','ins-search'); toIn.placeholder='To-ID (z.B. depot)';
    const runCarrier = el('button','ins-btn','Carrier-Route starten');
    box.append(runDoors, fromIn, toIn, runCarrier);

    // Output-View (monospace Kachel)
    const view = el('div','slot-logs-view');
    view.style.background='var(--ins-panel-2)';

    // Door/Pathfinding
    runDoors.addEventListener('click', ()=>{
      try{
        if (window.Game?.Tests?.doorsCheck){
          const res = window.Game.Tests.doorsCheck();
          log('doorsCheck ausgeführt', JSON.stringify(res));
          view.textContent = Array.isArray(res)&&res.length
            ? res.map(r=>`Block: ${r.x},${r.y} — ${r.reason||''}`).join('\n')
            : 'Keine Tür-/Pfad-Probleme gefunden.';
        }else{
          // Heuristische Prüfung: Felder mit „door“ o.ä. in Map scannen – falls API existiert
          const blocks = window.Game?.Map?.scanBlocked?.() || [];
          warn('doorsCheck Polyfill genutzt. Binde Game.Tests.doorsCheck() an, um präzisere Ergebnisse zu bekommen.');
          view.textContent = blocks.length ? blocks.map(b=>`Block: ${b.x},${b.y}`).join('\n') : 'Keine Auffälligkeiten.';
        }
      }catch(e){ warn('doorsCheck Fehler', e?.message); view.textContent='Fehler beim Prüfen.'; }
    });

    // Carrier pendeln lassen
    runCarrier.addEventListener('click', ()=>{
      const from = (fromIn.value||'rathaus').trim();
      const to   = (toIn.value||'depot').trim();
      try{
        if (window.Game?.Tests?.spawnCarrierRoute){
          window.Game.Tests.spawnCarrierRoute(from,to);
          log('Carrier-Route gestartet', from,'→',to);
          view.textContent = `Carrier-Route gestartet: ${from} → ${to}`;
        }else{
          warn('Kein Game.Tests.spawnCarrierRoute() vorhanden.');
          view.textContent = 'Bitte Hook Game.Tests.spawnCarrierRoute(fromId,toId) implementieren.';
        }
      }catch(e){ warn('Carrier Fehler', e?.message); view.textContent='Fehler beim Starten der Route.'; }
    });

    host.append(box, view);
    log('bereit');
  });
})();
