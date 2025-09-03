/* ============================================================================
 * assets/ui/ui-build.js — v17.3.2
 * Aufgabe:
 *   - Minimaler Hook für Bau-UI (nutzt GameUI-Events/Toggle)
 *   - Kein eigenes Rendering mehr notwendig (Bridge hat Fallback)
 * Logs:
 *   - "[ok] Bau-Menü bereit (ui-build.js v17.3.2)"
 * ============================================================================ */
(function(){
  'use strict';
  try{
    window.addEventListener('cb:build-open', ()=>{ /* Platz für zukünftige Panel-Befüllung */ });
    window.addEventListener('cb:build-close', ()=>{ /* … */ });
    (window.CBLog?.ok||console.log)('[ok] Bau-Menü bereit (ui-build.js v17.3.2)');
  }catch(e){
    (window.CBLog?.warn||console.warn)('[ui-build] Fehler: '+(e?.message||e));
  }
})();
