/* ============================================================================
 * Neue Siedler – Inspector API Bridge
 * Version: v1.0.0
 * ui/inspector/inspector.api-bridge.js
 * Zweck: Stellt die Lastenheft-API (InspectorAPI.open/close/toggle) bereit,
 *        falls der geladene Inspector sie (noch) nicht exportiert.
 *        → Keine Änderungen an Inspector-Modulen nötig.
 *
 * Regel:
 *  1) Wenn InspectorAPI bereits existiert → nichts tun.
 *  2) Wenn es eine alte API gibt (window.Inspector.*) → darauf adaptieren.
 *  3) Wenn es nur Event-basierte Varianten gibt → Events abfeuern.
 *  4) Als allerletzter Fallback: versuche sichtbares Overlay zu togglen.
 * ========================================================================== */
(function(){
  'use strict';
  var MOD = '[inspector.api-bridge]';

  // Bereits vorhanden? → Brücke ist neutral.
  if (window.InspectorAPI && typeof window.InspectorAPI.toggle === 'function') {
    try { (console.log||function(){}) (MOD, 'API vorhanden – Bridge inaktiv'); } catch(_){}
    return;
  }

  // Hilfsfunktionen: ältere / event-basierte Pfade
  function _hasOld(){
    return !!(window.Inspector && (window.Inspector.toggle || window.Inspector.open || window.Inspector.close));
  }
  function _oldToggle(){
    try{
      if (window.Inspector?.toggle) return void window.Inspector.toggle();
      if (window.Inspector?.open)   return void window.Inspector.open();
      // sonst Events
      window.dispatchEvent(new CustomEvent('inspector:toggle'));
      window.dispatchEvent(new CustomEvent('cb:inspector:toggle'));
    }catch(_){}
  }
  function _oldOpen(){
    try{
      if (window.Inspector?.open) return void window.Inspector.open();
      window.dispatchEvent(new CustomEvent('inspector:open'));
      window.dispatchEvent(new CustomEvent('cb:inspector:open'));
    }catch(_){}
  }
  function _oldClose(){
    try{
      if (window.Inspector?.close) return void window.Inspector.close();
      window.dispatchEvent(new CustomEvent('inspector:close'));
      window.dispatchEvent(new CustomEvent('cb:inspector:close'));
    }catch(_){}
  }

  // Letzter Fallback: DOM-Overlay togglen (nur wenn vorhanden)
  function _domToggle(){
    var el = document.querySelector('#inspector, .inspector-overlay, .inspector-root');
    if (!el) { _oldToggle(); return; } // nichts zu tun → zumindest Events feuern
    var shown = el.style && el.style.display !== 'none';
    el.style.display = shown ? 'none' : 'block';
  }

  // Öffentliche, lastenheft-konforme API bereitstellen
  window.InspectorAPI = {
    open: function(){
      if (_hasOld()) return _oldOpen();
      _domToggle(); // zeigt wenn versteckt
    },
    close: function(){
      if (_hasOld()) return _oldClose();
      _domToggle(); // versteckt wenn gezeigt
    },
    toggle: function(){
      if (_hasOld()) return _oldToggle();
      _domToggle();
    }
  };

  try { (console.log||function(){}) (MOD, 'bereit – InspectorAPI via Bridge gestellt'); } catch(_){}
})();
