/* ============================================================================
 * Inspector Pfade
 * ui/inspector/inspector.paths.js – v18.14.4
 *  - Overlay/Heatmap Demo (best effort Hooks auf overlay-hooks / Game)
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[inspector.paths]'; const VER='v18.14.4';
  const core = window.__INSPECTOR_CORE__?.api; if(!core){ console.warn(MOD,'core fehlt'); return; }
  const log=(lvl,msg)=> (window.CBLog?.[lvl]||console.log)(msg);

  core.mount('paths', ()=>{
    const host = core.getSlot('paths-view'); if(!host) return;
    host.innerHTML='';

    const btnOverlay = document.createElement('button'); btnOverlay.className='ins-btn'; btnOverlay.textContent='Overlay umschalten';
    const btnResetHM = document.createElement('button'); btnResetHM.className='ins-btn'; btnResetHM.textContent='Heatmap zurücksetzen';

    const stat = document.createElement('pre'); stat.style.marginTop='10px';

    let overlayOn = false; let heatMax = 0;

    btnOverlay.addEventListener('click',()=>{
      overlayOn = !overlayOn;
      try{ window.dispatchEvent(new CustomEvent('cb:overlay-toggle',{detail:{on:overlayOn}})); }catch(_){}
      log('info',`[paths] Overlay: ${overlayOn?'AN':'AUS'}`);
      render();
    });
    btnResetHM.addEventListener('click',()=>{
      heatMax = 0;
      try{ window.dispatchEvent(new CustomEvent('cb:overlay-heat-reset')); }catch(_){}
      log('warn','[paths] Heatmap zurückgesetzt');
      render();
    });

    function render(){ stat.textContent = `Overlay: ${overlayOn?'AN':'AUS'}\nHeatmap-Max: ${heatMax}`; }

    host.append(btnOverlay, btnResetHM, stat);
    render();

    // best effort Listener (falls Overlay Daten liefert)
    window.addEventListener('overlay:heatmax', (e)=>{
      heatMax = e?.detail?.max ?? heatMax; render();
    });

    console.log(MOD,'bereit',VER);
  });

})();
