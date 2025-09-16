/* ============================================================================
 * registry.json-adapter.js — lädt data/buildings.json und speist die Registry
 * Version: v1.0.1
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[registry.json-adapter]';

  function log(){ try{ (window.CBLog?.info||console.log)(MOD, ...arguments); }catch{} }
  function warn(){ try{ (window.CBLog?.warn||console.warn)(MOD, ...arguments); }catch{} }

  function toast(msg){
    try{
      var t=document.createElement('div');
      t.textContent=msg;
      t.style.cssText='position:fixed;left:12px;bottom:12px;z-index:2147483647;padding:8px 10px;'
        +'background:rgba(0,0,0,.7);color:#fff;font:12px/1.2 system-ui;border-radius:6px;'
        +'box-shadow:0 6px 18px rgba(0,0,0,.35)';
      document.body.appendChild(t);
      setTimeout(function(){ t.remove(); }, 1600);
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

      // UI neu ableiten lassen
      window.dispatchEvent(new CustomEvent('cb:assets-ready', { detail:{ source:'json-adapter' }}));

      // **NEU**: Registry explizit als ready signalisieren (mit Counts)
      var cats = window.Registry?.list?.('categories')?.length || 0;
      var blds = window.Registry?.list?.('buildings')?.length || 0;
      try { window.Registry.__ready = true; } catch(_){}
      window.dispatchEvent(new CustomEvent('cb:registry:ready', {
        detail:{ ready:true, counts:{ categories:cats, buildings:blds }, source:'json-adapter' }
      }));

      log('applied', cnt, 'buildings; ready dispatched (cats:',cats,'blds:',blds,')');
      toast('Daten geladen: '+cnt+' Gebäude');
    } catch(e){
      warn('failed to load data/buildings.json', e);
      toast('Daten konnten nicht geladen werden');
    }
  }

  if (window.Registry?.__ready) { // Registry existiert, ggf. schon ready → trotzdem anwenden
    loadAndApply();
  } else {
    window.addEventListener('cb:registry:ready', loadAndApply, { once:true });
    // Falls das Event nie kam: nach kurzer Zeit trotzdem laden
    setTimeout(function(){ if (window.Registry) loadAndApply(); }, 80);
  }
})();
