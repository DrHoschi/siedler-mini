/* ============================================================================
 * Datei: main/ui/ui-events.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Zentrale CustomEvent-Helfer (Namespace 'ui:*'), Logging-Schalter.
 * Datum: 2025-09-22
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ============================================================================ */

(function(){
  'use strict';
  const MOD='[ui-events]';
  const VERSION='v1.0.0';

  // Debug-Flag (global schaltbar)
  window.UI_EVENT_DEBUG = (window.UI_EVENT_DEBUG!==undefined) ? window.UI_EVENT_DEBUG : true;

  // Logging util
  function log(type, ...args){
    if(!window.UI_EVENT_DEBUG) return;
    const tag = type==='err' ? '❌' : type==='warn' ? '⚠️' : '🔔';
    console[type==='err'?'error':(type==='warn'?'warn':'log')](tag, MOD, ...args);
  }

  // Dispatch Helper
  function emit(name, detail){
    try{
      window.dispatchEvent(new CustomEvent(name, { detail }));
      log('log', 'emit', name, detail||{});
    }catch(e){
      log('err', 'emit failed', name, e);
    }
  }

  // Subscribe Helper
  function on(name, handler, opts){
    try{
      const fn = (ev)=>handler(ev.detail, ev);
      window.addEventListener(name, fn, opts||false);
      log('log', 'on', name);
      return ()=>window.removeEventListener(name, fn, opts||false);
    }catch(e){
      log('err', 'on failed', name, e);
      return ()=>{};
    }
  }

  window.UIEvents = { VERSION, emit, on, log };
  log('log', `ready ${VERSION}`);
})();