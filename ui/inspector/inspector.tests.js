/* ============================================================================
 * Inspector Tests – v18.15.0
 *  ui/inspector/inspector.tests.js
 *  - Kleine, nützliche Testhelfer mit Logs
 *  - + NEU: Sektion "Events" (Browser-Scan via EventScan-API)
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.tests]'; const VER='v18.15.0';
  // Robust auf deinen alten Inspector gemappt:
const core = (function(){
  // 1) Falls es eine zentrale API gibt – nutze sie
  if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;

  // 2) Sonst direkt auf deinen Inspector adaptieren
  const ins = window.Inspector || window.__INSPECTOR__ || window.inspector || {};
  const api = {};

  api.registerTab = (def)=>{
    if (typeof ins.registerTab === 'function') return ins.registerTab(def);
    if (typeof ins.addTab === 'function')      return ins.addTab(def);
    // Fallback: sofort in bekannten Slot rendern
    const host = api.getSlot('tests-view');
    if (host && typeof def.onShow === 'function') def.onShow(host);
  };

  api.getSlot = (name)=>{
    return document.querySelector(`#inspector [data-slot="${name}"]`)
        || document.querySelector(`[data-inspector-slot="${name}"]`)
        || document.getElementById(`ins-${name}`)
        || document.getElementById(name);
  };

  api.mount = (id,onShow)=> api.registerTab({ id, title:id, onShow });

  return api;
})();
  // ------- kleine UI-Helfer -------
  function btn(lbl, fn){ const b=document.createElement('button'); b.className='ins-btn'; b.textContent=lbl; b.addEventListener('click', fn); return b; }
  function h3(txt){ const n=document.createElement('h3'); n.textContent=txt; return n; }
  function p(txt){ const n=document.createElement('p'); n.textContent=txt; return n; }
  const log=(lvl,msg)=> (window.CBLog?.[lvl]||console.log)(msg);

  core.mount('tests', ()=>{
    const host = core.getSlot('tests-view'); if (!host) return;
    host.innerHTML='';

    // =========================================================
    // SEKTION: Events (Browser-Scan)
    // =========================================================
    const evBox = document.createElement('div');
    evBox.appendChild(h3('Events'));
    evBox.appendChild(p('Scannt geladene Skripte (cb:/req:/emit:) im Browser.'));
    const bar = document.createElement('div'); bar.style.display='flex'; bar.style.gap='8px'; bar.style.alignItems='center'; bar.style.margin='6px 0';
    const btnScan = btn('Scan now', async ()=>{
      if(!window.EventScan){ log('warn','[tests] EventScan-API nicht geladen'); return; }
      btnScan.disabled = true; btnDl.disabled = true; status.textContent = 'Starte Scan …'; result.innerHTML='';
      const rows = await window.EventScan.run((i,n,file,err)=>{
        status.textContent = err ? `(${i}/${n}) Fehler: ${file}` : `(${i}/${n}) ${file}`;
      });
      const md = window.EventScan.lastMD;
      // einfache Tabellendarstellung (Markdown bleibt downloadbar)
      result.innerHTML = `<pre style="white-space:pre-wrap">${md.replace(/</g,'&lt;')}</pre>`;
      status.textContent = `Fertig: ${rows.length} Treffer.`;
      btnScan.disabled = false; btnDl.disabled = rows.length === 0;
      log('ok','[tests] Event-Scan abgeschlossen');
    });
    const btnDl = btn('Download MD', ()=>{
      window.EventScan?.download();
      log('info','[tests] Event-Scan MD exportiert');
    });
    const status = document.createElement('div'); status.style.opacity='.8'; status.style.fontSize='.9em';
    const result = document.createElement('div'); result.style.maxHeight='38vh'; result.style.overflow='auto'; result.style.border='1px solid #444'; result.style.padding='6px'; result.style.borderRadius='6px';
    bar.appendChild(btnScan); bar.appendChild(btnDl);
    evBox.appendChild(bar); evBox.appendChild(status); evBox.appendChild(result);
    host.appendChild(evBox);

    // =========================================================
    // SEKTION: Pfad / Türen
    // =========================================================
    host.appendChild(h3('Pfad / Türen'));
    host.appendChild(btn('Tür-Pfad Test', ()=>{
      log('info','[tests] Tür-Pfad-Test gestartet');
      try{ window.GameTests?.doorPathTest?.(); }catch(_){}
    }));

    // =========================================================
    // SEKTION: Transport / Carrier
    // =========================================================
    host.appendChild(h3('Transport / Carrier'));
    host.appendChild(btn('Carrier Demo (Rathaus ↔ Depot)', ()=>{
      log('info','[tests] Carrier-Demo gestartet');
      try{ window.GameTests?.carrierTownhallDepot?.(); }catch(_){}
    }));

    // =========================================================
    // SEKTION: Engine
    // =========================================================
    host.appendChild(h3('Engine'));
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
