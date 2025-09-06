/* ============================================================================
 * Inspector Tests – v18.11.1
 *  - Kleine Selbsttests und Demo-Buttons
 * ========================================================================== */
(function(){
  'use strict';
  const core = window.__INSPECTOR_CORE__;
  if(!core?.api) return;

  core.api.mount('tests', ()=>{
    const host = core.api.getSlot('tests-host'); if(!host) return;
    host.innerHTML='';

    const row = document.createElement('div'); row.className='ins-controls';
    const info = (t)=>{ try{ (window.CBLog?.info||console.log)(t); }catch(_){ console.log(t); } };
    const ok   = (t)=>{ try{ (window.CBLog?.ok||console.log)(t); }catch(_){ console.log(t); } };
    const warn = (t)=>{ try{ (window.CBLog?.warn||console.warn)(t); }catch(_){ console.warn(t); } };
    const err  = (t)=>{ try{ (window.CBLog?.err||console.error)(t); }catch(_){ console.error(t); } };

    const b1=document.createElement('button'); b1.className='ins-toggle'; b1.textContent='Test: INFO';
    const b2=document.createElement('button'); b2.className='ins-toggle'; b2.textContent='Test: OK';
    const b3=document.createElement('button'); b3.className='ins-toggle'; b3.textContent='Test: WARN';
    const b4=document.createElement('button'); b4.className='ins-toggle'; b4.textContent='Test: ERR';

    b1.onclick=()=>info('[tests] info ping');
    b2.onclick=()=>ok('[tests] ok ping');
    b3.onclick=()=>warn('[tests] warn ping');
    b4.onclick=()=>err('[tests] err ping');

    row.append(b1,b2,b3,b4);

    const help=document.createElement('div');
    help.style.cssText='opacity:.75;margin-top:8px';
    help.textContent='Kleine Buttons schreiben direkt in den Log-Stream.';

    host.append(row, help);
  });
})();
