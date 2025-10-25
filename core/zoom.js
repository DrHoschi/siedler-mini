/* ============================================================================
 * Datei    : core/zoom.js
 * Projekt  : Neue Siedler – Engine Basis
 * Version  : v25.10.25-final
 * Zweck    : Zentraler Zoom-Controller (Scale-Status + Event-Dispatch)
 *
 * API:
 *   Zoom.scale        → aktueller Zoom-Faktor (1.0 = 100 %)
 *   Zoom.set(n)       → neuen Zoom setzen (0.5–3.0 erlaubt)
 *   Zoom.reset()      → auf 1.0 zurücksetzen
 *
 * Events:
 *   cb:zoom:change    { scale:Number }   → bei jeder Änderung
 *
 * Verwendung:
 *   - map-runtime.js reagiert auf cb:zoom:change → MapRuntime.setView({scale})
 *   - Overlays (unit/path) folgen automatisch
 *
 * Tastatursteuerung (optional, aktiv):  STRG+Mausrad oder ALT+W/S
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[zoom]';
  const LOG  = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a)=> (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // --- State -----------------------------------------------------------------
  const Z = {
    scale: 1,
    min: 0.5,
    max: 3.0,
    step: 0.1,

    /** Setzt neuen Zoom-Faktor und feuert Event */
    set(n){
      const val = Math.max(Z.min, Math.min(Z.max, Number(n)||1));
      if (Math.abs(val - Z.scale) < 0.0001) return; // keine Änderung
      Z.scale = val;
      LOG('scale =', val.toFixed(2));
      window.dispatchEvent(new CustomEvent('cb:zoom:change', { detail:{ scale: val } }));
    },

    /** Reset auf Standard-Zoom */
    reset(){
      Z.set(1.0);
    }
  };

  // --- Maus/Tastatursteuerung -----------------------------------------------
  // Aktiviert, wenn gewünscht; verhindert Zoom-Sprünge
  let wheelTimer = 0;
  function onWheel(ev){
    if (!ev.ctrlKey) return; // STRG+Scroll
    ev.preventDefault();
    const delta = (ev.deltaY > 0 ? -1 : 1) * Z.step;
    Z.set(Z.scale + delta);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(()=>window.dispatchEvent(new CustomEvent('cb:zoom:change',{detail:{scale:Z.scale}})),100);
  }

  function onKey(ev){
    if (!ev.altKey) return; // ALT+W/S
    if (ev.key.toLowerCase()==='w') Z.set(Z.scale + Z.step);
    if (ev.key.toLowerCase()==='s') Z.set(Z.scale - Z.step);
  }

  window.addEventListener('wheel', onWheel, { passive:false });
  window.addEventListener('keydown', onKey);

  // --- Public-API ------------------------------------------------------------
  window.Zoom = Z;
  LOG('bereit (v25.10.25-final, scale=' + Z.scale + ')');
})();
