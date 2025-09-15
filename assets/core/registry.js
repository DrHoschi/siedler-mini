/* ============================================================================
 * registry.json-adapter.js — lädt data/buildings.json und speist die Registry
 * Version: v1.0.0
 *
 * Ablauf:
 *  - wartet auf cb:registry:ready (oder nutzt sofort, wenn schon ready)
 *  - lädt data/buildings.json (no-store)
 *  - Registry.upsert('buildings', {..., ui:{icon:...}})
 *  - dispatcht 'cb:assets-ready' (damit build.categories.js neu ableitet)
 *  - zeigt einen kleinen Toast unten links (iPad-freundlicher "OK"-Hinweis)
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[registry.json-adapter]';

  function log(){ try{ console.log.apply(console, arguments);}catch{} }
  function warn(){ try{ console.warn.apply(console, arguments);}catch{} }

  function toast(msg){
    try{
      var t=document.createElement('div');
      t.textContent=msg;
      t.style.cssText='position:fixed;left:12px;bottom:12px;z-index:2147483647;padding:8px 10px;'
        +'background:rgba(0,0,0,.7);color:#fff;font:12px/1.2 system-ui;border-radius:6px;'
        +'box-shadow:0 6px 18px rgba(0,0,0,.35)';
      document.body.appendChild(t);
      setTimeout(function(){ t.remove(); }, 1800);
    }catch(_){}
  }

  async function loadAndApply(){
    try{
      const res = await fetch('data/buildings.json', { cache:'no-store' });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const base = (data.iconsBase || '').replace(/\/?$/, '/');

      var cnt = 0;
      (data.buildings||[]).forEach(function(b){
        // ui.icon aus iconsBase + icon-Name auflösen (wenn nicht schon absolut)
        var icon = b.icon && (b.icon.startsWith('assets/') || b.icon.startsWith('http'))
          ? b.icon
          : (base + (b.icon || ''));

        var patch = {
          id:b.id, name:b.name, cat:b.cat, sprite:b.sprite,
          enabled:b.enabled, size:b.size, place:b.place,
          ui:{ icon: icon }
        };
        window.Registry?.upsert('buildings', patch);
        cnt++;
      });

      // Event für UI-Neuaufbau
      window.dispatchEvent(new CustomEvent('cb:assets-ready', { detail:{ source:'json-adapter' }}));

      log(MOD,'applied', cnt, 'buildings from data/buildings.json');
      toast('Daten geladen: '+cnt+' Gebäude');
    } catch(e){
      warn(MOD,'failed to load data/buildings.json', e);
      toast('Daten konnten nicht geladen werden');
    }
  }

  if (window.Registry?.__ready) loadAndApply();
  else window.addEventListener('cb:registry:ready', loadAndApply, { once:true });
})();
