/* ============================================================================
 * Inspector Build – v18.11.1
 *  - Einfache Buttons aus window.BUILD_CATEGORIES (oder Fallback)
 *  - Sendet CustomEvent('cb:build-select',{detail:{type:id}})
 * ========================================================================== */
(function(){
  'use strict';
  const core = window.__INSPECTOR_CORE__;
  if(!core?.api) return;

  core.api.mount('build', ()=>{
    const host = core.api.getSlot('build-host'); if(!host) return;
    host.innerHTML='';

    const cats = (Array.isArray(window.BUILD_CATEGORIES) && window.BUILD_CATEGORIES.length)
      ? window.BUILD_CATEGORIES
      : [
          { id:'general', title:'Allg.', items:[
            {id:'hq',label:'Hauptquartier'},
            {id:'depot',label:'Depot'},
            {id:'house',label:'Haus'}
          ]},
          { id:'production', title:'Produktion', items:[
            {id:'farm',label:'Farm'},
            {id:'fischer',label:'Fischer'}
          ]},
        ];

    const mkH = (t)=>{ const d=document.createElement('div'); d.textContent=t; d.style.cssText='opacity:.85;margin:6px 0 4px;font-weight:700'; return d; };
    const mkBtn=(txt)=>{ const b=document.createElement('button'); b.className='ins-toggle active'; b.textContent=txt; return b; };

    cats.forEach(cat=>{
      host.appendChild(mkH(cat.title||cat.id));
      const row=document.createElement('div'); row.className='ins-controls';
      (cat.items||[]).forEach(it=>{
        const btn = mkBtn(it.label||it.id);
        btn.addEventListener('click',()=>{
          try{ window.dispatchEvent(new CustomEvent('cb:build-select',{detail:{type:it.id}})); }catch(_){}
          try{ (window.CBLog?.ok||console.log)(`[ui] Build-Select ${it.id}`); }catch(_){}
        });
        row.appendChild(btn);
      });
      host.appendChild(row);
    });
  });
})();
