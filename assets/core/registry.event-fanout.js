/* ============================================================================
 * registry.event-fanout.js — stellt sicher, dass cb:registry:ready ankommt
 * Version: v1.0.0
 *
 * Aufgaben:
 *  - Wenn cb:registry:ready irgendwo (window ODER document) ankommt,
 *    dann auf BEIDE Targets weiterleiten (Fanout) und Payload merken.
 *  - Falls bis zu cb:game-start noch kein Ready-Signal gesehen wurde,
 *    wird eines synthetisch erzeugt (mit aktuellen Registry-Counts).
 *  - Optionaler Replay nach kurzer Zeit (späte Listener).
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[registry.event-fanout]';
  function log(){ try{ (window.CBLog?.info||console.log)(MOD, ...arguments); }catch{} }

  var lastDetail = null;
  var seen = false;

  function counts(){
    var R = window.Registry || {};
    var cats = R.list?.('categories')?.length || 0;
    var blds = R.list?.('buildings')?.length  || 0;
    return { categories:cats, buildings:blds };
  }

  function fanout(detail){
    lastDetail = detail || { ready:true, counts:counts(), source:'fanout' };
    seen = true;
    try { window.dispatchEvent(new CustomEvent('cb:registry:ready', { detail:lastDetail })); } catch(_){}
    try { document.dispatchEvent(new CustomEvent('cb:registry:ready', { detail:lastDetail })); } catch(_){}
    log('fanout → ready (cats:', lastDetail.counts?.categories, 'blds:', lastDetail.counts?.buildings, ')');
  }

  // 1) Wenn Ready irgendwo ankommt → Fanout & merken
  function onReady(ev){ fanout(ev?.detail || null); }
  window.addEventListener('cb:registry:ready', onReady);
  document.addEventListener('cb:registry:ready', onReady);

  // 2) Später Replay für späte Listener (0ms / 120ms)
  setTimeout(function(){ if (seen && lastDetail) fanout(lastDetail); }, 0);
  setTimeout(function(){ if (seen && lastDetail) fanout(lastDetail); }, 120);

  // 3) Falls bis zum Spielstart noch nichts kam → synthetisch senden
  function ensureByGameStart(){
    if (!seen) fanout({ ready:true, counts:counts(), source:'fanout-synth' });
  }
  window.addEventListener('cb:game-start', ensureByGameStart, { once:true });

  // 4) Kleine Sicherheitsleine nach kurzer Zeit
  setTimeout(function(){ if (!seen) fanout({ ready:true, counts:counts(), source:'fanout-timeout' }); }, 300);
})();
