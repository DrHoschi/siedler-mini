/* ============================================================================
 * Datei   : ui/inspector/inspector.button-bind.js
 * Projekt : Neue Siedler – Inspector
 * Version : v25.10.31-bind4
 * Zweck   : Zahnrad/Hotkey → NUR req:insp:toggle senden
 *
 * Lauscht : (nichts für Sichtbarkeit)
 * Sendet  : req:insp:toggle
 * ============================================================================ */
(function(){
  'use strict';

  const MOD = '[insp-bind]';
  const LOGI = (window.CBLog?.info||console.log).bind(console, MOD);

  function sendToggle(){
    window.dispatchEvent(new CustomEvent('req:insp:toggle'));
  }

  function bind(){
    // Zahnrad-Button (deine ID/Selektor beibehalten)
    const btn = document.getElementById('btn-inspector') || document.querySelector('[data-action="inspector-toggle"]');
    if (btn){
      btn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); sendToggle(); }, { passive:false });
    }
    // Hotkey (z. B. F10) – optional
    window.addEventListener('keydown', (e)=>{
      if (e.key === 'F10'){
        e.preventDefault();
        sendToggle();
      }
    }, { passive:false });

    LOGI('Button/Hotkey gebunden (v25.10.31-bind4)');
  }

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', bind, { once:true })
    : bind();
})();
