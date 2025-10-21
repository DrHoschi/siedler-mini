/* ============================================================================
 * ui/inspector/inspector.ensure-button.js
 * Macht #btn-inspector sichtbar & funktionsfähig (Click + Taste I)
 * – robust gegen fehlende API / verschiedene Overlay-IDs
 * ========================================================================== */
(function(){
  'use strict';
  const LOG  = (window.CBLog?.info  || console.info).bind(console);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console);
  const ERR  = (window.CBLog?.error || console.error).bind(console);

  /** mögliche Overlay-Hosts (dein Inspector hat je nach Build andere IDs) */
  const HOST_IDS = ['inspector-overlay','inspector','ui-inspector','inspector-root'];

  function q(sel){ return document.querySelector(sel); }
  function host(){
    for(const id of HOST_IDS){ const el = document.getElementById(id); if(el) return el; }
    // Fallback: irgend ein div mit data-role/inspector
    return q('[data-role="inspector"], [data-inspector]');
  }

  function ensureBtn(){
    let btn = document.getElementById('btn-inspector') || q('[data-role="btn-inspector"]');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.setAttribute('aria-label','Inspector');
      btn.title = 'Inspector (I)';
      btn.textContent = '🔧';
      document.body.appendChild(btn);
      LOG('[insp] Button erzeugt (#btn-inspector)');
    }
    btn.removeAttribute('hidden');
    // falls ein anderer Layer davor liegt → z-index korrigieren
    btn.style.zIndex = Math.max(100000, parseInt(getComputedStyle(btn).zIndex||'0',10) || 0);
    return btn;
  }

  function api(){
    // deine möglichen APIs
    const ins = window.Inspector || window.__INSPECTOR__ || window.inspector || {};
    return {
      open : typeof ins.open  === 'function' ? ins.open  .bind(ins) : null,
      close: typeof ins.close === 'function' ? ins.close .bind(ins) : null,
      toggle: typeof ins.toggle=== 'function' ? ins.toggle.bind(ins) : null
    };
  }

  function toggleInspector(){
    try{
      const a = api();
      if(a.toggle){ a.toggle(); return; }
      if(a.open && a.close){
        const h = host();
        const open = h && (h.classList.contains('open') || h.style.display === 'block' || h.hidden === false);
        open ? a.close() : a.open();
        return;
      }
      // Event-Bridge, falls dein Core darauf hört
      window.dispatchEvent(new CustomEvent('cb:insp:toggle'));

      // HARTE Absicherung: direkt den Host toggeln
      const h = host();
      if(h){
        const vis = h.classList.contains('open') || h.style.display === 'block';
        h.classList.toggle('open', !vis);
        h.style.display = vis ? 'none' : 'block';
        h.hidden = false;
        LOG('[insp] Toggle per Overlay-Fallback');
      }else{
        WARN('[insp] Kein Inspector-Host gefunden. IDs geprüft:', HOST_IDS.join(', '));
      }
    }catch(e){
      ERR('[insp] Toggle-Fehler:', e);
    }
  }

  function bind(btn){
    // Neu binden (alte Listener verwerfen)
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
    clone.addEventListener('click', toggleInspector, { passive:true });
    window.addEventListener('keydown', (e)=>{
      if(e.key && e.key.toLowerCase()==='i' && !e.altKey && !e.ctrlKey && !e.metaKey){
        toggleInspector();
      }
    });
    LOG('[insp] Button gebunden (Click + I)');
  }

  function start(){
    const btn = ensureBtn();
    bind(btn);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  }else{
    start();
  }
})();
