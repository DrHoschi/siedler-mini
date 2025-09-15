/* ============================================================================
 * ui-build.data-bridge.js — Brücke Registry → UI (Bau-Menü)
 * Version: v17.0.3
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[ui-build.data-bridge]';
  var DEFAULT_ICON='assets/ui/build/placeholder.png';

  // Fallback-Icons für deine deutschen IDs
  var ICON_FALLBACKS = {
    rathaus:'assets/ui/build/rathaus.png',
    depot:'assets/ui/build/depot.png',
    wohnhaus:'assets/ui/build/wohnhaus.png',
    fischer:'assets/ui/build/fischer.png',
    farm:'assets/ui/build/farm.png',
    muehle:'assets/ui/build/muehle.png',
    lumberjack:'assets/ui/build/lumberjack.png',
    steinmetz:'assets/ui/build/steinmetz.png',
    schmied:'assets/ui/build/schmied.png',
    baecker:'assets/ui/build/baecker.png',
    wachtturm:'assets/ui/build/wachtturm.png',
    hq:'assets/ui/build/hq.png',
    path_dirt:'assets/ui/build/path.png'
  };

  function log(){ try{ console.log.apply(console, arguments);}catch{} }
  function normIcon(p){ return p ? String(p) : DEFAULT_ICON; }

  function pickRegistry(){
    if (window.Registry && typeof window.Registry.list==='function') return { type:'array', api: window.Registry };
    if (window.Core && window.Core.Registry) return { type:'object', api: window.Core.Registry };
    if (window.ASSET_REGISTRY) return { type:'object', api: window.ASSET_REGISTRY };
    if (window.REGISTRY) return { type:'object', api: window.REGISTRY };
    if (window.REGISTRY_BUILDINGS) return { type:'legacy', api:{ buildings: window.REGISTRY_BUILDINGS } };
    return null;
  }

  var Bridge={
    hasRegistry:function(){
      return !!pickRegistry();
    },

    getCategories:function(){
      // Falls build.categories schon berechnet hat: nutzen
      if (Array.isArray(window.BUILD_CATEGORIES) && window.BUILD_CATEGORIES.length){
        return window.BUILD_CATEGORIES;
      }
      // sonst minimal aus Registry ableiten
      var reg = pickRegistry();
      if(!reg) return [];

      if (reg.type==='array'){
        var catsArr = reg.api.list('categories')||[];
        var bldArr  = reg.api.list('buildings') ||[];
        var catIndex = Object.create(null);
        catsArr.forEach(function(c){
          catIndex[c.id] = { id:c.id, title:c.name||c.id, order:(c.sort|0)||9999, items:[] };
        });
        bldArr.forEach(function(b){
          if (b.enabled===false) return;
          var catId=(b.cat||'misc').toLowerCase();
          if(!catIndex[catId]) catIndex[catId]={ id:catId, title:catId[0].toUpperCase()+catId.slice(1), order:9999, items:[] };
          catIndex[catId].items.push({
            id:b.id,
            label:b.name||b.id,
            // Icon-Heuristik: explizites Icon optional (künftig ui.icon),
            // sonst bekannte Fallbacks, sonst assets/ui/build/<id>.png
            icon:normIcon(ICON_FALLBACKS[b.id] || ('assets/ui/build/'+b.id+'.png')),
            kind:'building',
            order:9999
          });
        });
        var cats = Object.keys(catIndex).map(function(k){ return catIndex[k]; });
        cats.forEach(function(c){ c.items.sort(function(a,b){ return (a.order|0)-(b.order|0) || String(a.label).localeCompare(String(b.label));});});
        cats.sort(function(a,b){ return (a.order|0)-(b.order|0) || String(a.title).localeCompare(String(b.title));});
        return cats;
      }

      // Object-/Legacy-Pfad (wie zuvor)
      var R2 = reg.api, out=[];
      var buildings=(R2 && R2.buildings)||{};
      var catMap=Object.create(null);
      Object.keys(buildings).forEach(function(id){
        var b=buildings[id]||{}, ui=b.ui||{}, meta=b.meta||{};
        var catId=(meta.category||'misc').toLowerCase();
        if(!catMap[catId]) catMap[catId]={ id:catId, title:meta.categoryTitle||(catId[0].toUpperCase()+catId.slice(1)), order:(meta.orderCat|0)||9999, items:[] };
        catMap[catId].items.push({
          id:b.id||id, label:b.label||id,
          icon:normIcon(ui.icon||ui.iconPath||('assets/ui/build/'+id+'.png')),
          kind:b.kind||'building', order:(meta.order|0)||9999
        });
      });
      out = Object.keys(catMap).map(function(k){ return catMap[k]; });
      out.forEach(function(c){ c.items.sort(function(a,b){ return (a.order|0)-(b.order|0) || String(a.label).localeCompare(String(b.label));});});
      out.sort(function(a,b){ return (a.order|0)-(b.order|0) || String(a.title).localeCompare(String(b.title));});
      return out;
    },

    getItemById:function(id){
      var cats=this.getCategories();
      for(var i=0;i<cats.length;i++){
        var items=cats[i].items||[];
        for(var j=0;j<items.length;j++){
          if(items[j].id===id) return items[j];
        }
      }
      return null;
    },

    getIconFor:function(id){
      // Wenn später ui.icon in Registry kommt, könnten wir es hier lesen
      // (für jetzt: Fallback-Tabelle → /assets/ui/build/<id>.png)
      return normIcon(ICON_FALLBACKS[id] || ('assets/ui/build/'+id+'.png'));
    }
  };

  window.BuildDataBridge = Bridge;
  log(MOD,'bereit — Registry erkannt:', !!pickRegistry());
})();
