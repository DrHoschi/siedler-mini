/* ============================================================================
 * Inspector Ressourcen – v18.14.4
 *  - Einfache Buttons zum Füllen/Leeren sogenannter Ressourcen (Demo)
 *  - Nutzt, wenn vorhanden, Game.Resources API; ansonsten nur Log
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.resources]'; const VER='v18.14.4';
  const core = window.__INSPECTOR_CORE__?.api; if(!core){ console.warn(MOD,'core fehlt'); return; }
  const log=(lvl,msg)=> (window.CBLog?.[lvl]||console.log)(msg);

  core.mount('resources', ()=>{
    const host = core.getSlot('resources-view'); if(!host) return;
    host.innerHTML='';
    const row = document.createElement('div'); row.className='ins-row';
    function add(label, kind){
      const b=document.createElement('button'); b.className='ins-btn'; b.textContent='+'+label;
      b.addEventListener('click',()=>{
        log('ok',`[resources] +${label}`);
        try{ window.Game?.Resources?.add?.(kind, 10); }catch(_){}
      });
      row.appendChild(b);
    }
    add('Holz','wood'); add('Stein','stone'); add('Weizen','wheat'); add('Fisch','fish');
    const clr=document.createElement('button'); clr.className='ins-btn'; clr.textContent='Alles leeren';
    clr.addEventListener('click',()=>{
      log('warn','[resources] Alle Ressourcen leeren');
      try{ window.Game?.Resources?.clearAll?.(); }catch(_){}
    });

    host.append(row, clr);
    console.log(MOD,'bereit',VER);
  });

})();
