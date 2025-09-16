/* ============================================================================
 * registry.json-adapter.js — lädt data/buildings.json und speist die Registry
 * Version: v1.0.2 (single-source-of-truth für cb:registry:ready, einmalig)
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[registry.json-adapter]';
  var log = function(){ try{ (window.CBLog?.info||console.log)(MOD, ...arguments);}catch{} };
  var warn= function(){ try{ (window.CBLog?.warn||console.warn)(MOD, ...arguments);}catch{} };

  // Einmal-Guard für Ready-Signal
  function fireReadyOnce(source){
    if (window.__registryReadyOnce) return;
    window.__registryReadyOnce = true;
    try { if (window.Registry) window.Registry.__ready = true; } catch(_){}
    var cats = window.Registry?.list?.('categories')?.length || 0;
    var blds = window.Registry?.list?.('buildings') ?.length || 0;
    try {
      window.dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail:{ ready:true, counts:{ categories:cats, buildings:blds }, source:source||'json-adapter' }
      }));
      log('ready dispatched (cats:',cats,'blds:',blds,')');
    } catch(_){}
  }

  async function loadAndApply(){
    try{
      const res = await fetch('data/buildings.json', { cache:'no-store' });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const base = (data.iconsBase || '').replace(/\/?$/, '/');

      var cnt = 0;
      (data.buildings||[]).forEach(function(b){
        var icon = b.icon && (b.icon.startsWith('assets/') || b.icon.startsWith('http'))
          ? b.icon : (base + (b.icon || ''));
        var patch = {
          id:b.id, name:b.name, cat:b.cat, sprite:b.sprite,
          enabled:b.enabled, size:b.size, place:b.place,
          ui:{ icon: icon }
        };
        window.Registry?.upsert('buildings', patch);
        cnt++;
      });

      // Assets-Folgesignal (für UI-Neuaufbau)
      window.dispatchEvent(new CustomEvent('cb:assets-ready', { detail:{ source:'json-adapter' }}));

      // Einmalig das Ready-Signal senden (einzige Quelle)
      fireReadyOnce('json-adapter');

      log('applied', cnt, 'buildings');
    } catch(e){
      warn('failed to load data/buildings.json', e);
      // Falls JSON fehlt: Registry ggf. trotzdem als ready markieren, damit Entities starten kann
      fireReadyOnce('json-adapter-fallback');
    }
  }

  function start(){
    // Wenn Registry existiert → sofort laden; sonst minimal warten.
    if (window.Registry) loadAndApply();
    else setTimeout(function(){ if (window.Registry) loadAndApply(); }, 50);
  }

  start();
})();
