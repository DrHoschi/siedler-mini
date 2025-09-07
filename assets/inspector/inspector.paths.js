/* ============================================================================
 * Datei: assets/inspector/inspector.paths.js
 * Projekt: Siedler-Mini
 * Version: v18.13.0
 *
 * Zweck:
 *  - Pfade-Tab: Overlay toggeln, Heatmap resetten, kleine Stats
 *    • cb:paths:toggle
 *    • cb:paths:reset
 * ========================================================================= */
(function(){
  'use strict';

  const MOD='[inspector.paths]';
  const VER='v18.13.0';
  const core = window.__INSPECTOR_CORE__;
  if (!core || !core.api){ console.warn(MOD,'core fehlt'); return; }

  core.api.mount('paths', ()=>{
    const host = core.api.getSlot('paths');
    if (!host) return;

    host.innerHTML = `
      <div class="ins-paths">
        <div class="row">
          <button class="ins-btn" id="p-toggle">Overlay umschalten</button>
          <button class="ins-btn" id="p-reset">Heatmap zurücksetzen</button>
        </div>
        <div class="stat">
          <div>Overlay: <span id="p-state">unbekannt</span></div>
          <div>Heatmap-Max: <span id="p-max">–</span></div>
        </div>
      </div>
    `;

    const elState = host.querySelector('#p-state');
    const elMax   = host.querySelector('#p-max');

    function refresh(){
      const on = !!(window.__cb && window.__cb.pathsEnabled);
      const max = (window.__cb && window.__cb.pathsHeatMax) || 0;
      elState.textContent = on ? 'AN' : 'AUS';
      elMax.textContent = String(max);
    }
    refresh();

    host.querySelector('#p-toggle').addEventListener('click', ()=>{
      try{ window.dispatchEvent(new Event('cb:paths:toggle')); }catch(_){}
      setTimeout(refresh,60);
    });
    host.querySelector('#p-reset').addEventListener('click', ()=>{
      try{ window.dispatchEvent(new Event('cb:paths:reset')); }catch(_){}
      setTimeout(refresh,60);
    });

    (window.CBLog?.ok||console.log)(MOD,'bereit', VER);
  });

})();
