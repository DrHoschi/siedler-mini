/* ============================================================================
 * Datei: main/ui/ui-notify.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Notification/Toast-System (Queue + Auto-Dismiss)
 * Datum: 2025-09-22
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ============================================================================ */

(function(){
  'use strict';
  const MOD='[ui-notify]';
  const VERSION='v1.0.0';

  const DURATION = 4000; // ms
  let container;

  function ensureContainer(){
    if(container) return container;
    container=document.createElement('div');
    container.id='ui-notify-container';
    container.style.position='fixed';
    container.style.right='12px';
    container.style.bottom='12px';
    container.style.display='flex';
    container.style.flexDirection='column';
    container.style.gap='8px';
    container.style.zIndex=10001;
    document.body.appendChild(container);
    return container;
  }

  function push(msg,type){
    const cont=ensureContainer();
    const item=document.createElement('div');
    item.className='ui-panel notify-item type-'+(type||'info');
    item.textContent=msg;
    cont.appendChild(item);
    setTimeout(()=>{ item.remove(); }, DURATION);
  }

  // Globale API
  window.UINotify = { push, VERSION };

  // Debug-Log
  (console.log||(()=>{}))('🔔', MOD, 'bereit', VERSION);
})();