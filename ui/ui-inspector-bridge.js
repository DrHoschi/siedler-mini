/* ============================================================================
 * Datei: main/ui/ui-inspector-bridge.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Brücke zum Inspector (bestehendes Panel ui-inspector.js) + Tab 'Editoren'
 * Datum: 2025-09-22
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ============================================================================ */

(function(){
  'use strict';
  const MOD='[insp-bridge]';
  const VERSION='v1.0.0';

  // Health-Ping (zeigt, dass UI lebt)
  function ping(){
    window.dispatchEvent(new CustomEvent('cb:insp:ping', { detail: { from:'ui', ts: Date.now(), version: VERSION } }));
  }

  // Externe API: Öffne Inspector mit Tab 'Editoren'
  function openEditors(){
    // Falls UIInspector vorhanden (aus ui-inspector.js), nutze dessen API
    if(window.UIInspector && typeof window.UIInspector.open==='function'){
      window.UIInspector.open('Editor');
    }else{
      // Fallback: generisches Ereignis – Inspector sollte selbst reagieren
      window.dispatchEvent(new CustomEvent('cb:insp:open', { detail: { tab:'Editor' } }));
    }
  }

  // Button-Hook (optional): data-open-editors
  document.addEventListener('click', (ev)=>{
    const el = ev.target;
    if(el && el.matches?.('[data-open-editors]')){
      openEditors();
    }
  });

  // Periodischer Ping (alle 10s)
  setInterval(ping, 10_000);
  ping();

  window.UIInspectorBridge = { openEditors, ping, VERSION };
  (console.log||(()=>{}))('🪝', MOD, 'bereit', VERSION);
})();