/* ============================================================================
 * Datei   : ui/ui-place.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v1.4.0 (2025-10-05)
 * Zweck   : Platzier-UI (Ghost, Confirm, Cancel)
 * Events  :
 *   IN : cb:place:preview { id,gx,gy,tx,ty,invalid,... }
 *   IN : cb:build:mode    { active:boolean }
 *   OUT: cb:place:confirm { id,gx,gy }    (nur 1x pro Ghost)
 *   OUT: cb:place:cancel
 *
 * Änderungen v1.4.0:
 *   - Confirm-Lock (de-dupe) gegen sporadische „nichts passiert“
 *   - Auto-Release des Locks (Fail-Safe)
 *   - Log-Ausgaben für Mobile-WebInspector
 * ============================================================================ */
(function(){
  'use strict';
  const LOG  = (window.CBLog?.ok  || console.log).bind(console, '[ui-place]');
  const WARN = (window.CBLog?.warn|| console.warn).bind(console, '[ui-place]');

  // --- interner State --------------------------------------------------------
  let ghost = null; // { id,gx,gy,invalid, ... }
  let lock  = false;
  let lockTimer = 0;

  function setLock(v){
    lock = !!v;
    clearTimeout(lockTimer);
    if (lock) {
      // Fail-Safe: wenn Spiel nicht reagiert (z.B. Event verloren), Lock lösen
      lockTimer = setTimeout(()=>{ lock=false; LOG('confirm-lock auto-release'); }, 800);
    }
  }

  function confirmOnce(){
    if (!ghost || ghost.invalid) { WARN('confirm: ghost invalid/leer'); return; }
    if (lock) { WARN('confirm: locked – de-dupe'); return; }
    setLock(true);

    const payload = { id: ghost.id, gx: ghost.tx ?? ghost.gx, gy: ghost.ty ?? ghost.gy };
    LOG('confirm (tile) →', payload);
    window.dispatchEvent(new CustomEvent('cb:place:confirm', { detail: payload }));
  }

  function cancel(){
    if (!ghost) return;
    LOG('cancel');
    window.dispatchEvent(new Event('cb:place:cancel'));
    ghost = null; setLock(false);
  }

  // --- Buttons / Eingabe (hier simpel gehalten) -----------------------------
  // Tipp: Wenn du Bestätigungs-Buttons im Ghost zeichnest -> hier binden.
  window.addEventListener('keydown', (e)=>{
    if (!ghost) return;
    if (e.key==='Enter') confirmOnce();
    else if (e.key==='Escape') cancel();
  });

  // --- Ghost-Vorschau vom Game ----------------------------------------------
  window.addEventListener('cb:place:preview', (e)=>{
    ghost = e?.detail || null;
    if (ghost?.invalid) { /* sichtbare UI ggf. disable */ }
  });

  // --- Public Hooks (falls UI-Toggle Panels hat) -----------------------------
  window.addEventListener('cb:build:mode', (e)=>{
    const active = !!e?.detail?.active;
    if (!active) { ghost=null; setLock(false); }
  });

  // Exponiere (optional) kleine API für Buttons im DOM
  window.UIPlace = {
    confirm: confirmOnce,
    cancel : cancel
  };

  LOG('ready');
})();
