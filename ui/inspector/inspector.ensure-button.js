/* ============================================================================
 * Datei   : ui/inspector/inspector.ensure-button.js
 * Zweck   : Stellt sicher, dass #btn-inspector existiert & funktioniert
 * Hinweis : Läuft nach den Inspector-Skripten; minimal-invasiv.
 * ========================================================================== */
(function(){
  'use strict';
  const LOG = (window.CBLog?.info||console.info);
  const WARN= (window.CBLog?.warn||console.warn);

  function getBtn(){
    return document.getElementById('btn-inspector')
        || document.querySelector('[data-role="btn-inspector"]');
  }

  function ensureBtn(){
    let btn = getBtn();
    if(!btn){
      // Notfall: Button erstellen (nur wenn keiner vorhanden ist)
      btn = document.createElement('button');
      btn.id = 'btn-inspector';
      btn.setAttribute('aria-label','Inspector');
      btn.title = 'Inspector (I)';
      document.body.appendChild(btn);
      LOG('[ensure-insp] Button erzeugt (#btn-inspector)');
    }
    // Sichtbar machen
    btn.removeAttribute('hidden');
    btn.style.display = ''; // falls CSS inline mal 'none' gesetzt hatte
    // Minimal-Styles, falls im CSS nichts gesetzt ist (kannst du wieder entfernen)
    if(!btn.style.position){
      btn.style.position = 'fixed';
      btn.style.right = '14px';
      btn.style.bottom = '14px';
      btn.style.zIndex = 99999;
      btn.style.width = '44px';
      btn.style.height = '44px';
      btn.style.borderRadius = '8px';
      btn.style.border = '0';
      btn.style.boxShadow = '0 2px 8px rgba(0,0,0,.35)';
      btn.style.fontWeight = '700';
      btn.textContent = 'ⓘ';
    }
    return btn;
  }

  function toggleInspector(){
    // 1) Bevorzugt: vorhandene API
    const insp = window.Inspector || window.__INSPECTOR__ || window.inspector;
    if(insp?.toggle){ insp.toggle(); return; }
    if(insp?.open && insp?.close){
      const host = document.getElementById('inspector-overlay') || document.getElementById('inspector');
      const isOpen = host && (host.classList?.contains('open') || host.style.display === 'block');
      isOpen ? insp.close() : insp.open();
      return;
    }
    // 2) Event-Bridge (deine Inspector-Module horchen oft darauf)
    window.dispatchEvent(new CustomEvent('cb:insp:toggle'));
    // 3) Ultima Ratio: Overlay-Klasse toggeln
    const host = document.getElementById('inspector-overlay') || document.getElementById('inspector');
    if(host){
      const vis = host.classList.contains('open');
      host.classList.toggle('open', !vis);
      host.style.display = vis ? 'none' : 'block';
      LOG('[ensure-insp] Toggle per Overlay-Fallback');
    }else{
      WARN('[ensure-insp] Kein Inspector-Overlay gefunden. Prüfe DOM-IDs/CSS.');
    }
  }

  function bind(btn){
    // Doppelte Handler vermeiden
    btn.replaceWith(btn.cloneNode(true));
    btn = getBtn();
    btn.addEventListener('click', toggleInspector);
    // Tastenkürzel: I
    window.addEventListener('keydown', (e)=>{
      if (e.key?.toLowerCase() === 'i' && !e.altKey && !e.ctrlKey && !e.metaKey){
        toggleInspector();
      }
    });
    LOG('[ensure-insp] Button gebunden (Click + Taste I)');
  }

  function start(){
    const btn = ensureBtn();
    bind(btn);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
