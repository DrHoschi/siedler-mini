/* ============================================================================
 * registry.json-adapter.js — lädt data/buildings.json und upsertet in Registry
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[registry.json-adapter]';
  function log(){ try{ console.log.apply(console, arguments);}catch{} }
  function warn(){ try{ console.warn.apply(console, arguments);}catch{} }

  async function loadAndApply(){
    try{
      const res = await fetch('data/buildings.json', { cache:'no-store' });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const base = (data.iconsBase || '').replace(/\/?$/, '/');
      (data.buildings||[]).forEach(function(b){
        var patch = {
          id:b.id, name:b.name, cat:b.cat, sprite:b.sprite,
          enabled:b.enabled, size:b.size, place:b.place,
          ui:{ icon: b.icon?.startsWith('assets/') ? b.icon : (base + (b.icon||'')) }
        };
        window.Registry?.upsert('buildings', patch);
      });
      // unsere build.categories.js hört auf 'cb:assets-ready' → neu ableiten
      window.dispatchEvent(new CustomEvent('cb:assets-ready', { detail:{ source:'json-adapter' } }));
      log(MOD,'applied', (data.buildings||[]).length, 'buildings');
    } catch(e){
      warn(MOD,'failed to load data/buildings.json', e);
    }
  }

  // Starten sobald Registry existiert
  if (window.Registry?.__ready) loadAndApply();
  else window.addEventListener('cb:registry:ready', loadAndApply, { once:true });
})();
