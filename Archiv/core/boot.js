/* ============================================================================
 * core/boot.js — Startmodul für Siedler-Mini
 * Version: v1.0.0
 * ============================================================================
 * Verantwortlich für:
 * - Initialisierung des Spiels
 * - Laden der Assets
 * - Eventsteuerung für Start- & Ladeprozesse
 * - Absetzen von Standard-Events für das UI
 * ============================================================================
 */

(function(){
  'use strict';

  const VERSION = 'v1.0.0';

  console.log('[boot] Modul geladen', VERSION);

  // Init: Assets preload → Game-Start
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[boot] DOM geladen');

    // Beispielhafter Ablauf
    dispatchEvent(new CustomEvent('cb:assets-ready'));
    dispatchEvent(new CustomEvent('cb:registry:ready'));

    // Starte neues Spiel oder lade Spielstand
    setTimeout(() => {
      dispatchEvent(new CustomEvent('cb:game-start', { detail: { map: 'default' }}));
      console.log('[boot] Spielstart erfolgt');
    }, 100);
  });

  // Reagiere auf Start-Kommando
  window.addEventListener('cb:start:new', () => {
    console.log('[boot] Neues Spiel starten...');
    dispatchEvent(new CustomEvent('cb:game-start'));
  });

  window.addEventListener('cb:start:continue', () => {
    console.log('[boot] Spielstand laden...');
    dispatchEvent(new CustomEvent('cb:game-start', { detail: { fromSave: true }}));
  });

})();
