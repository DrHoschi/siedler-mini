/* ============================================================================
 * Inspector Paths – v18.12.3
 * - Zeigt/prüft Pfad-Daten über Game-Hooks (wenn vorhanden)
 *   Erwartete Hooks (optional):
 *     Game.Paths?.list() -> Array<{id,len,from,to,blocked?:bool}>
 *     Game.Paths?.rebuild()
 *     OverlayHooks?.drawPaths(list)
 * ========================================================================== */
(function(){
  'use strict';
  const core = window.__INSPECTOR_CORE__; if (!core?.api) return;
  const MOD='[inspector.paths]';
  const log=(...a)=>(window.CBLog?.ok||console.log)(MOD,...a);
  const warn=(...a)=>(window.CBLog?.warn||console.warn)(MOD,...a);

  function el(tag,cls,html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  core.api.mount('paths', ()=>{
    const host = core.api.getSlot('paths'); if (!host) return;
    host.innerHTML='';

    const top = el('div','ins-controls');
    const btnReload = el('button','ins-btn','Neu laden');
    const btnRebuild = el('button','ins-btn','Pfad-Cache neu aufbauen');
    top.append(btnReload, btnRebuild);

    const view = el('div','slot-logs-view'); // wir nutzen das schöne Monospace-Panel
    view.style.background='var(--ins-panel-2)';

    function renderList(){
      view.innerHTML='';
      try{
        const list = window.Game?.Paths?.list?.() || [];
        if (!list.length){ view.textContent='Keine Pfade gefunden.'; return; }
        const f = document.createDocumentFragment();
        list.forEach(p=>{
          const line=el('div','log-line log-info', `[${p.id}] len=${p.len} ${p.from}→${p.to}${p.blocked?' (BLOCKED)':''}`);
          if (p.blocked) line.className='log-line log-warn';
          f.appendChild(line);
        });
        view.appendChild(f);
      }catch(e){ warn('list', e?.message); view.textContent='Fehler beim Lesen der Pfade.'; }
    }

    btnReload.addEventListener('click', renderList);
    btnRebuild.addEventListener('click', ()=>{
      try{ window.Game?.Paths?.rebuild?.(); log('rebuild angestoßen'); }catch(e){ warn('rebuild',e?.message); }
      renderList();
    });

    host.append(top, view);
    renderList();
  });
})();
