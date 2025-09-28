/* ============================================================================
 * Inspector Build – v18.12.3
 * - Zeigt kleine Laufzeitinfos + "Neu laden"
 * ========================================================================== */
(function(){
  'use strict';
  const core = window.__INSPECTOR_CORE__; if (!core?.api) return;
  const MOD='[inspector.build]';
  const ok=(...a)=>(window.CBLog?.ok||console.log)(MOD,...a);

  function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

  core.api.mount('build', ()=>{
    const host = core.api.getSlot('build'); if (!host) return;
    host.innerHTML='';
    const box = el('div','ins-build');
    const line = (k,v)=> `<div style="display:flex;gap:8px"><b style="min-width:140px">${k}</b><span>${v}</span></div>`;

    box.innerHTML = `
      ${line('UserAgent', navigator.userAgent)}
      ${line('Viewport', `${window.innerWidth} × ${window.innerHeight}`)}
      ${line('Lang', navigator.language)}
      <div style="margin-top:10px;display:flex;gap:10px">
        <button class="ins-btn" id="ins-reload">Neu laden</button>
      </div>
    `;
    host.appendChild(box);
    host.querySelector('#ins-reload')?.addEventListener('click', ()=> location.reload());

    ok('bereit');
  });
})();
