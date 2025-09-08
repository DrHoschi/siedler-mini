/* ============================================================================
 * Overlay Hooks (Fallback) – v1.4
 *  - Zeigt nur dann ein kleines "Inspector (Fallback) lädt …" an,
 *    wenn nach Toggle kein Core geöffnet wurde.
 *  - Verhindert doppelte Fallbacks.
 * ========================================================================== */
(function(){
  'use strict';
  const MOD='[overlay-hooks]'; const WAIT_MS=500; // kurze Wartezeit

  let fbEl=null, fbTimer=null, isOpen=false;
  function ensureFallback(){
    if (fbEl) return fbEl;
    fbEl = document.createElement('div');
    fbEl.className='ins-fallback';
    fbEl.innerHTML = `
      <div class="fb-panel">
        <div class="fb-head"><strong>Inspector (Fallback)</strong><button class="fb-close" type="button">Schließen</button></div>
        <div class="fb-body">Inspector lädt…</div>
      </div>`;
    fbEl.querySelector('.fb-close').addEventListener('click', ()=>{ hideFallback(); window.dispatchEvent(new CustomEvent('cb:inspector-close')); });
    document.body.appendChild(fbEl);
    return fbEl;
  }
  function showFallback(){ ensureFallback(); fbEl.style.display='flex'; }
  function hideFallback(){ if (fbEl) fbEl.style.display='none'; }

  // Toggle-Events kommen aus deiner UI
  window.addEventListener('cb:inspector-open', ()=>{
    isOpen = true;
    // kurze Gnadenfrist: wenn Core nicht reagiert -> Fallback
    clearTimeout(fbTimer);
    fbTimer = setTimeout(()=>{
      const core = window.__INSPECTOR_CORE__;
      const visible = document.getElementById('inspector')?.style.display === 'flex';
      if (!core || !visible) showFallback();
    }, WAIT_MS);
  });
  window.addEventListener('cb:inspector-close', ()=>{ isOpen=false; clearTimeout(fbTimer); hideFallback(); });

  // Core meldet sich -> Fallback schließen
  window.addEventListener('inspector:ready', ()=> hideFallback());
  window.addEventListener('inspector:open',  ()=> hideFallback());
  window.addEventListener('inspector:close', ()=> hideFallback());

  console.log(MOD,'bereit v1.4');
})();
