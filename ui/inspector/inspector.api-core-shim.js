/* ============================================================================
 * Datei   : ui/inspector/inspector.api-core-shim.js
 * Version : v1.0.0 (2025-10-21)
 * Zweck   : Stellt __INSPECTOR_CORE__.api + Inspector.registerTab bereit,
 *           wenn der geladene Inspector sie (noch) nicht liefert.
 * ========================================================================== */
(function(){
  'use strict';
  // 1) Bestehende Inspector-Objekte erkennen
  const insp = window.Inspector || window.__INSPECTOR__ || window.inspector || window.UIInspector;

  // 2) registerTab-Adapter (nur wenn noch nicht vorhanden)
  function _registerTab(def){
    // Versuche vorhandene Methoden zuerst
    if (insp?.registerTab) return insp.registerTab(def);
    if (insp?.addTab)      return insp.addTab(def);
    if (insp?.tabs?.register) return insp.tabs.register(def);

    // Ganz simpler Fallback: Tab-Queue, die beim "inspector:ready" verarbeitet wird
    (window.__INSPECTOR_TAB_QUEUE__ ||= []).push(def);
  }

  if (!window.Inspector) window.Inspector = {};
  if (typeof window.Inspector.registerTab !== 'function'){
    window.Inspector.registerTab = _registerTab;
  }

  // 3) __INSPECTOR_CORE__.api für Tests-Tab bereitstellen (nur wenn fehlt)
  if (!window.__INSPECTOR_CORE__ || !window.__INSPECTOR_CORE__.api){
    const api = {
      // Minimal-Schnittstelle, die dein Tests-Tab nutzt
      registerTab(def){ window.Inspector.registerTab(def); },
      mount(id, onShow){ window.Inspector.registerTab({ id, title: id, onShow }); },
      // Slotsuche: nutze deine DOM-Struktur (anpassen möglich)
      getSlot(name){
        return document.querySelector(`#inspector [data-slot="${name}"]`)
            || document.querySelector(`[data-inspector-slot="${name}"]`)
            || document.getElementById(`ins-${name}`)
            || document.getElementById(name);
      }
    };
    window.__INSPECTOR_CORE__ = { api };
  }

  // 4) Wenn dein Inspector später ein „ready“-Event feuert, Tabs aus der Queue nachtragen
  function flushQueue(){
    const q = window.__INSPECTOR_TAB_QUEUE__ || [];
    if (!q.length) return;
    const copy = q.splice(0, q.length);
    for (const def of copy) try { window.Inspector.registerTab(def); } catch(_){}
  }

  // Häufige Eventnamen abdecken
  ['inspector:ready','cb:inspector:ready','INSPECTOR_READY'].forEach(evt=>{
    window.addEventListener(evt, flushQueue);
  });

  // Sicherheitshalber nach DOM bereitstellen
  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(flushQueue, 200);
  } else {
    document.addEventListener('DOMContentLoaded', ()=> setTimeout(flushQueue, 200));
  }

  (window.CBLog?.ok || console.log)('[inspector.api-core-shim] bereit');
})();
