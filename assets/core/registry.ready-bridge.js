/* ============================================================================
 * registry.ready-bridge.js — sorgt dafür, dass cb:registry:ready sicher feuert
 * Version: v1.0.0
 *
 * Zweck:
 *  - Wenn window.Registry existiert, aber kein Ready-Event sichtbar war,
 *    setzen wir (vorsichtig) __ready und dispatchen 'cb:registry:ready'.
 *  - Wenn Registry bereits ready ist, tun wir nichts.
 *  - Läuft NACH registry.js & json-adapter.js und VOR entities.registry.js.
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[registry.ready-bridge]';

  function log(){ try{ console.log.apply(console, arguments);}catch{} }

  function countsFrom(reg){
    try {
      var cats = (typeof reg.list==='function') ? reg.list('categories')||[] : [];
      var blds = (typeof reg.list==='function') ? reg.list('buildings') ||[] : [];
      return { categories: cats.length|0, buildings: blds.length|0 };
    } catch(_){ return { categories:0, buildings:0 }; }
  }

  function ensureReady(){
    var R = window.Registry;
    if (!R) return;                          // Registry fehlt → nichts tun
    if (R.__ready === true) return;          // schon ready → nichts tun

    // sanft auf ready setzen
    try { R.__ready = true; } catch(_){}

    var c = countsFrom(R);
    try {
      window.dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail: { ready:true, counts:c }
      }));
      log(MOD,'cb:registry:ready dispatched (cats:',c.categories,'buildings:',c.buildings,')');
    } catch(_){}
  }

  // 1) Direkt versuchen (falls Registry synchron da ist)
  ensureReady();

  // 2) Kurz verzögert nochmal prüfen (nach json-adapter Upserts)
  setTimeout(ensureReady, 0);
  setTimeout(ensureReady, 100);
})();
