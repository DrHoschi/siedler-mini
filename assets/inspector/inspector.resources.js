/* ============================================================================
 * Datei: assets/inspector/inspector.resources.js
 * Projekt: Siedler-Mini
 * Version: v18.13.0
 *
 * Zweck:
 *  - Ressourcen-Tab: einfache Buttons zum Hinzufügen/Leeren
 *    • cb:res:add { kind }
 *    • cb:res:clear
 * ========================================================================= */
(function(){
  'use strict';

  const MOD='[inspector.resources]';
  const VER='v18.13.0';
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api){ console.warn(MOD,'core fehlt'); return; }

  const ITEMS = [
    { id:'wood',  label:'Holz' },
    { id:'stone', label:'Stein' },
    { id:'wheat', label:'Weizen' },
    { id:'fish',  label:'Fisch' },
  ];

  core.api.mount('resources', ()=>{
    const host = core.api.getSlot('resources');
    if (!host) return;

    const wrap = document.createElement('div');
    wrap.className='ins-reswrap';

    const row = document.createElement('div');
    row.className='row';
    ITEMS.forEach(it=>{
      const b=document.createElement('button');
      b.className='ins-btn';
      b.textContent = `+ ${it.label}`;
      b.addEventListener('click', ()=>{
        try{ window.dispatchEvent(new CustomEvent('cb:res:add', { detail:{ kind: it.id }})); }catch(_){}
        (window.CBLog?.ok||console.log)('[res] add', it.id);
      });
      row.appendChild(b);
    });

    const controls = document.createElement('div');
    controls.className='row';
    const clr = document.createElement('button'); clr.className='ins-btn'; clr.textContent='Alles leeren';
    clr.addEventListener('click', ()=>{
      try{ window.dispatchEvent(new Event('cb:res:clear')); }catch(_){}
      (window.CBLog?.warn||console.warn)('[res] clear');
    });

    controls.appendChild(clr);
    wrap.append(row, controls);
    host.innerHTML=''; host.appendChild(wrap);

    (window.CBLog?.ok||console.log)(MOD,'bereit', VER);
  });

})();
