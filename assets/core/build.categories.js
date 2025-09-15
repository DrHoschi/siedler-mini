/* ============================================================================
 * build.categories.js — Kategorien + Items fürs Tabbed-Dock (Registry-Ready)
 * Version: v17.0.2
 * Projekt: Siedler-Mini
 *
 * ZWECK
 *  - Stellt window.BUILD_CATEGORIES bereit (kompatibel zu ui-build.js)
 *  - Leitet primär aus Registry ab; robust mit statischem Fallback
 *  - Reagiert auf 'cb:registry:ready' / 'cb:assets-ready' / 'cb:game-start'
 *
 * API (global)
 *   window.BUILD_CATEGORIES : Array<Category>
 *   Category = { id, title, order?, items: Array<Item> }
 *   Item = { id, label, icon, kind?, order?, todo? }
 *
 * EVENTS (dispatch)
 *   'cb:build-categories-ready' { detail: { categories, source } }
 * ========================================================================== */
(function(){
  'use strict';
  var MOD = '[build.categories]';
  var EVT_READY = 'cb:build-categories-ready';

  function log(){ try{ console.log.apply(console, arguments); }catch(_){} }
  function warn(){ try{ console.warn.apply(console, arguments); }catch(_){} }

  function pickRegistry(){
    return (window.Core && window.Core.Registry)
        || window.ASSET_REGISTRY
        || window.REGISTRY
        || (window.REGISTRY_BUILDINGS ? { buildings: window.REGISTRY_BUILDINGS } : null);
  }
  function hasRegistry(){
    var r = pickRegistry();
    return !!(r && r.buildings && Object.keys(r.buildings).length);
  }

  function deriveFromRegistry(){
    var reg = pickRegistry();
    var buildings = (reg && reg.buildings) || {};
    var catMap = Object.create(null);

    Object.keys(buildings).forEach(function(id){
      var b = buildings[id] || {};
      var ui = b.ui || {};
      var meta = b.meta || {};
      var catId = (meta.category || 'misc').toLowerCase();
      var item = {
        id: b.id || id,
        label: b.label || id,
        icon: ui.icon || ui.iconPath || ('assets/ui/build/' + id + '.png'),
        kind: b.kind || 'building',
        order: typeof meta.order === 'number' ? meta.order : 9999
      };
      if(!catMap[catId]){
        catMap[catId] = {
          id: catId,
          title: meta.categoryTitle || (catId.charAt(0).toUpperCase()+catId.slice(1)),
          order: typeof (reg.categories && reg.categories[catId] && reg.categories[catId].order) === 'number'
            ? reg.categories[catId].order : 9999,
          items: []
        };
      }
      catMap[catId].items.push(item);
    });

    Object.keys(catMap).forEach(function(k){
      catMap[k].items.sort(function(a,b){
        var ao = (typeof a.order==='number') ? a.order : 9999;
        var bo = (typeof b.order==='number') ? b.order : 9999;
        if(ao !== bo) return ao - bo;
        return String(a.label).localeCompare(String(b.label));
      });
    });

    var categories = Object.keys(catMap).map(function(k){ return catMap[k]; });
    categories.sort(function(a,b){
      var ao = (typeof a.order==='number') ? a.order : 9999;
      var bo = (typeof b.order==='number') ? b.order : 9999;
      if(ao !== bo) return ao - bo;
      return String(a.title).localeCompare(String(b.title));
    });
    return categories;
  }

  function staticFallback(){
    return [
      { id:'basis', title:'Basis', order:10, items:[
        { id:'townhall', label:'Rathaus / HQ', icon:'assets/ui/build/hq.png', kind:'building', order:10 },
        { id:'depot',    label:'Depot',        icon:'assets/ui/build/depot.png', kind:'building', order:20 }
      ]},
      { id:'produktion', title:'Produktion', order:20, items:[
        { id:'lumberjack',  label:'Holzfäller',   icon:'assets/ui/build/lumberjack.png', kind:'building', order:10 },
        { id:'stonecutter', label:'Steinmetz',    icon:'assets/ui/build/stonecutter.png', kind:'building', order:20 },
        { id:'farm',        label:'Farm',         icon:'assets/ui/build/farm.png', kind:'building', order:30 },
        { id:'fisher',      label:'Fischerhütte', icon:'assets/ui/build/fisher.png', kind:'building', order:40 }
      ]},
      { id:'wege', title:'Wege', order:30, items:[
        { id:'path_dirt', label:'Trampelpfad', icon:'assets/ui/build/path.png', kind:'path', order:10 }
      ]}
    ];
  }

  function setAndDispatch(categories, source){
    window.BUILD_CATEGORIES = categories;
    log(MOD, 'bereit — Kategorien:', categories.length, 'Quelle:', source,
        'Items gesamt:', categories.reduce((n,c)=>n+(c.items?c.items.length:0),0));
    var evt = new CustomEvent(EVT_READY, { detail: { categories: categories, source: source } });
    window.dispatchEvent(evt);
  }

  function deriveAndPublish(sourceTag){
    try{
      var cats = hasRegistry() ? deriveFromRegistry() : staticFallback();
      if(!cats.length){ warn(MOD, 'Leere Kategorien → Fallback'); cats = staticFallback(); }
      setAndDispatch(cats, sourceTag);
    } catch(err){
      warn(MOD, 'Ableitfehler → Fallback', err);
      try { setAndDispatch(staticFallback(), sourceTag||'fallback-error'); } catch(_){}
    }
  }

  // Erstes Ableiten
  deriveAndPublish('initial');

  // Lastenheft-konforme Events
  window.addEventListener('cb:registry:ready', function(){ deriveAndPublish('cb:registry:ready'); });
  window.addEventListener('cb:assets-ready',   function(){ deriveAndPublish('cb:assets-ready');   });
  window.addEventListener('cb:game-start',     function(){ deriveAndPublish('cb:game-start');     });
})();
