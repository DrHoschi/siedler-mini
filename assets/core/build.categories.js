/* ============================================================================
 * build.categories.js — Kategorien + Items fürs Tabbed-Dock (Registry-Ready)
 * Version: v17.0.3
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[build.categories]';
  var EVT_READY='cb:build-categories-ready';

  function log(){ try{ console.log.apply(console, arguments);}catch{} }
  function warn(){ try{ console.warn.apply(console, arguments);}catch{} }

  // Registry erkennen (unterstützt: window.Registry (Array-API), Core.Registry, ASSET_REGISTRY, REGISTRY_BUILDINGS)
  function pickRegistry(){
    if (window.Registry && typeof window.Registry.list==='function') return { type:'array', api: window.Registry };
    if (window.Core && window.Core.Registry) return { type:'object', api: window.Core.Registry };
    if (window.ASSET_REGISTRY) return { type:'object', api: window.ASSET_REGISTRY };
    if (window.REGISTRY) return { type:'object', api: window.REGISTRY };
    if (window.REGISTRY_BUILDINGS) return { type:'legacy', api:{ buildings: window.REGISTRY_BUILDINGS } };
    return null;
  }

  function deriveFromRegistry(){
    var reg = pickRegistry();
    if(!reg){ return []; }

    // --- Variante A: Deine Registry (Array-API) ---
    if (reg.type==='array') {
      var R = reg.api;
      var catsArr = R.list('categories') || [];
      var bldArr  = R.list('buildings')  || [];

      // Index auf Kategorien (id → {title, order})
      var catIndex = Object.create(null);
      catsArr.forEach(function(c){
        catIndex[c.id] = {
          id: c.id,
          title: c.name || c.id,
          order: (typeof c.sort==='number') ? c.sort : 9999,
          items: []
        };
      });

      // Buildings einsortieren (nur enabled anzeigen)
      bldArr.forEach(function(b){
        if (b.enabled === false) return;
        var catId = (b.cat || 'misc').toLowerCase();
        if(!catIndex[catId]){
          catIndex[catId] = { id:catId, title:catId.charAt(0).toUpperCase()+catId.slice(1), order:9999, items:[] };
        }
        catIndex[catId].items.push({
          id: b.id,
          label: b.name || b.id,
          // Icon leiten wir NICHT aus sprite ab (das ist das große Gebäude),
          // sondern lassen die UI/Bridge passende Icons bestimmen.
          icon: 'assets/ui/build/'+b.id+'.png',
          kind: 'building',
          order: 9999
        });
      });

      var categories = Object.keys(catIndex).map(function(k){ return catIndex[k]; });
      categories.forEach(function(c){
        c.items.sort(function(a,b){ return (a.order|0)-(b.order|0) || String(a.label).localeCompare(String(b.label)); });
      });
      categories.sort(function(a,b){ return (a.order|0)-(b.order|0) || String(a.title).localeCompare(String(b.title)); });
      return categories;
    }

    // --- Varianten B/C: Objekt-Registries (abwärtskompatibel) ---
    var R2 = reg.api;
    var buildings = (R2 && R2.buildings) || {};
    var catMap = Object.create(null);
    Object.keys(buildings).forEach(function(id){
      var b = buildings[id]||{}, ui=b.ui||{}, meta=b.meta||{};
      var catId = (meta.category || 'misc').toLowerCase();
      if(!catMap[catId]){
        catMap[catId] = { id:catId, title: meta.categoryTitle || (catId[0].toUpperCase()+catId.slice(1)), order: (meta.orderCat|0) || 9999, items:[] };
      }
      catMap[catId].items.push({
        id: b.id || id,
        label: b.label || id,
        icon: ui.icon || ui.iconPath || ('assets/ui/build/'+id+'.png'),
        kind: b.kind || 'building',
        order: (meta.order|0) || 9999
      });
    });
    var cats = Object.keys(catMap).map(function(k){ return catMap[k]; });
    cats.forEach(function(c){ c.items.sort(function(a,b){ return (a.order|0)-(b.order|0) || String(a.label).localeCompare(String(b.label)); }); });
    cats.sort(function(a,b){ return (a.order|0)-(b.order|0) || String(a.title).localeCompare(String(b.title)); });
    return cats;
  }

  function staticFallback(){
    return [
      { id:'admin', title:'Allg. / Verwaltung', order:10, items:[
        { id:'rathaus', label:'Rathaus', icon:'assets/ui/build/rathaus.png', kind:'building', order:10 },
        { id:'depot',   label:'Depot',   icon:'assets/ui/build/depot.png',   kind:'building', order:20 }
      ]},
      { id:'raw', title:'Produktion / Rohstoffe', order:20, items:[
        { id:'lumberjack', label:'Holzfäller', icon:'assets/ui/build/lumberjack.png', kind:'building', order:10 },
        { id:'steinmetz',  label:'Steinmetz',  icon:'assets/ui/build/steinmetz.png',  kind:'building', order:20 }
      ]},
      { id:'food', title:'Produktion / Nahrung', order:30, items:[
        { id:'farm',    label:'Farm',        icon:'assets/ui/build/farm.png',    kind:'building', order:10 },
        { id:'fischer', label:'Fischer',     icon:'assets/ui/build/fischer.png', kind:'building', order:20 }
      ]}
    ];
  }

  function setAndDispatch(categories, source){
    window.BUILD_CATEGORIES = categories;
    log(MOD,'bereit — Kategorien:',categories.length,'Quelle:',source,
      'Items gesamt:',categories.reduce((n,c)=>n+(c.items?c.items.length:0),0));
    window.dispatchEvent(new CustomEvent(EVT_READY,{ detail:{ categories, source }}));
  }

  function deriveAndPublish(src){
    try{
      var cats = deriveFromRegistry();
      if(!cats.length) cats = staticFallback();
      setAndDispatch(cats, src||'initial');
    }catch(e){
      warn(MOD,'Ableitfehler',e);
      try{ setAndDispatch(staticFallback(),'fallback-error'); }catch(_){}
    }
  }

  deriveAndPublish('initial');
  // Events gemäß Lastenheft
  window.addEventListener('cb:registry:ready', function(){ deriveAndPublish('cb:registry:ready'); });
  window.addEventListener('cb:assets-ready',   function(){ deriveAndPublish('cb:assets-ready');   });
  window.addEventListener('cb:game-start',     function(){ deriveAndPublish('cb:game-start');     });
})();
