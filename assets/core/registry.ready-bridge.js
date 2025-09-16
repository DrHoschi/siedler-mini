/* ============================================================================
 * registry.ready-bridge.js — garantiert ein cb:registry:ready mit Counts
 * Version: v1.0.1
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[registry.ready-bridge]';
  function log(){ try{ (window.CBLog?.info||console.log)(MOD, ...arguments); }catch{} }

  function fireOnce(){
    var R = window.Registry;
    if (!R) return;
    var cats = R.list?.('categories')?.length || 0;
    var blds = R.list?.('buildings')?.length  || 0;
    try { R.__ready = true; } catch(_){}
    try {
      window.dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail:{ ready:true, counts:{ categories:cats, buildings:blds }, source:'ready-bridge' }
      }));
      log('dispatched (cats:',cats,'blds:',blds,')');
    } catch(_){}
  }

  // Sofort (wenn Registry schon da) …
  if (window.Registry) fireOnce();
  // … dann noch zweimal zeitnah (nach Adapter/Upserts), BEVOR Entities-Bridge arbeitet:
  setTimeout(fireOnce, 0);
  setTimeout(fireOnce, 50);
})();
