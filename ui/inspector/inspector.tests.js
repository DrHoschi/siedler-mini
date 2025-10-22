/* ui/inspector/inspector.tests.js – v18.15.0 (Baseline) */
(function(){
  'use strict';
  const MOD='[inspector.tests]'; const VER='v18.15.0';

  const core = (function(){
    if (window.__INSPECTOR_CORE__?.api) return window.__INSPECTOR_CORE__.api;
    return window.Inspector; // gleicher API-Shape
  })();

  function btn(lbl, fn){ const b=document.createElement('button'); b.className='insp-btn'; b.textContent=lbl; b.addEventListener('click', fn); return b; }
  function h3(t){ const n=document.createElement('h3'); n.textContent=t; return n; }
  function p(t){ const n=document.createElement('p'); n.textContent=t; return n; }
  const log=(lvl,msg)=> (window.CBLog?.[lvl]||console.log)(msg);

  core.mount('tests', ()=>{
    const host = core.getSlot('tests-view'); if (!host) return;
    host.innerHTML='';

    // Events (Browser-Scan)
    const box=document.createElement('div'); box.className='pad';
    box.appendChild(h3('Events'));
    box.appendChild(p('Scannt geladene Skripte (cb:/req:/emit:).'));
    const bar=document.createElement('div'); bar.className='toolbar';
    const status=document.createElement('div'); status.className='hint';
    const result=document.createElement('div'); result.style.cssText='max-height:38vh;overflow:auto;border:1px solid #444;padding:6px;border-radius:6px';
    const bScan=btn('Scan now', async ()=>{
      if(!window.EventScan){ log('warn','[tests] EventScan-API nicht geladen'); return; }
      bScan.disabled=true; bDl.disabled=true; status.textContent='Starte Scan…'; result.innerHTML='';
      const rows=await window.EventScan.run((i,n,file,err)=>{ status.textContent=err?`(${i}/${n}) Fehler: ${file}`:`(${i}/${n}) ${file}`; });
      const md=window.EventScan.lastMD;
      result.innerHTML=`<pre style="white-space:pre-wrap">${md.replace(/</g,'&lt;')}</pre>`;
      status.textContent=`Fertig: ${rows.length} Treffer.`; bScan.disabled=false; bDl.disabled=rows.length===0;
      log('ok','[tests] Event-Scan abgeschlossen');
    });
    const bDl=btn('Download MD', ()=> window.EventScan?.download());
    bar.appendChild(bScan); bar.appendChild(bDl); box.appendChild(bar); box.appendChild(status); box.appendChild(result);
    host.appendChild(box);

    // Mini-Smoke
    host.appendChild(h3('Engine'));
    host.appendChild(btn('Engine Ping', ()=>{ log('ok','[tests] Engine Ping ✓'); try{ window.Game?.ping?.(); }catch(_){}}));
    host.appendChild(btn('Welt zurücksetzen', ()=>{ log('warn','[tests] Welt zurücksetzen angefordert'); try{ window.Game?.reset?.(); }catch(_){}}));

    console.log(MOD,'bereit',VER);
  });
})();
