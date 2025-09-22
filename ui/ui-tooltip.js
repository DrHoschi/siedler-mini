/* ============================================================================
 * Datei: main/ui/ui-tooltip.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Tooltip-Handler (Hover/Fokus) – Accessibility & Debug-Hints
 * Datum: 2025-09-22
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ============================================================================ */

(function(){
  'use strict';
  const MOD='[ui-tooltip]';
  const VERSION='v1.0.0';

  // Default-Einstellungen
  const OFFSET = 12;

  // Hilfsfunktion: Tooltip-Element erzeugen
  function createEl(){
    const el=document.createElement('div');
    el.id='ui-tooltip';
    el.setAttribute('role','tooltip');
    el.style.position='fixed';
    el.style.pointerEvents='none';
    el.style.zIndex=10000;
    el.style.display='none';
    el.className='ui-panel';
    document.body.appendChild(el);
    return el;
  }

  const el = createEl();

  // Zeigen
  function show(text,x,y){
    el.textContent=text;
    el.style.left=(x+OFFSET)+'px';
    el.style.top=(y+OFFSET)+'px';
    el.style.display='block';
  }

  // Verstecken
  function hide(){
    el.style.display='none';
  }

  // Globale API
  window.UITooltip = { show, hide, VERSION };

  // Debug-Log
  (console.log||(()=>{}))('💬', MOD, 'bereit', VERSION);
})();