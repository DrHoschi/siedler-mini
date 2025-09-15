/* ============================================================================
 * ui-build.data-bridge.js — Brücke Registry → UI (Bau-Menü)
 * Version: v17.0.1
 * Projekt: Siedler-Mini
 * ========================================================================== */
(function(){
  'use strict';
  var MOD = '[ui-build.data-bridge]';
  var DEFAULT_ICON = 'assets/ui/build/placeholder.png';

  function log(){ try{ console.log.apply(console, arguments); }catch(_){} }

  function _pickRegistry(){
    return (window.Core && window.Core.Registry)
        || window.ASSET_REGISTRY
        || window.REGISTRY
        || (window.REGISTRY_BUILDINGS ? { buildings: window.REGISTRY_BUILDINGS } : null);
  }
  function _normIcon(icon){ return icon ? String(icon) : DEFAULT_ICON; }

  var Bridge = {
    hasRegistry: function(){
      var r = _pickRegistry();
      return !!(r && r.buildings && Object.keys(r.buildings).length);
    },

    getCategories: function(){
      // Wenn BUILD_CATEGORIES bereits vorhanden (durch build.categories.js), einfach nutzen:
      if(Array.isArray(window.BUILD_CATEGORIES) && window.BUILD_CATEGORIES.length){
        return window.BUILD_CATEGORIES;
      }
      // Notfalls selbst aus Registry ableiten (Minimal-Variante):
      var reg = _pickRegistry();
      if(reg && reg.buildings){
        var catMap = Object.create(null);
        Object.keys(reg.buildings).forEach(function(id){
          var b = reg.buildings[id]||{}, ui=b.ui||{}, meta=b.meta||{};
          var catId = (meta.category || 'misc').toLowerCase();
          if(!catMap[catId]){
            catMap[catId] = {
              id: catId,
              title: meta.categoryTitle || (catId.charAt(0).toUpperCase()+catId.slice(1)),
              order: typeof meta.orderCat==='number' ? meta.orderCat : 9999,
              items:[]
            };
          }
          catMap[catId].items.push({
            id: b.id || id,
            label: b.label || id,
            icon: _normIcon(ui.icon || ui.iconPath || ('assets/ui/build/' + id + '.png')),
            kind: b.kind || 'building',
            order: typeof meta.order==='number' ? meta.order : 9999
          });
        });
        var cats = Object.keys(catMap).map(function(k){ return catMap[k]; });
        cats.forEach(function(c){
          c.items.sort(function(a,b){
            var ao=(typeof a.order==='number')?a.order:9999;
            var bo=(typeof b.order==='number')?b.order:9999;
            if(ao!==bo) return ao-bo;
            return String(a.label).localeCompare(String(b.label));
          });
        });
        cats.sort(function(a,b){
          var ao=(typeof a.order==='number')?a.order:9999;
          var bo=(typeof b.order==='number')?b.order:9999;
          if(ao!==bo) return ao-bo;
          return String(a.title).localeCompare(String(b.title));
        });
        return cats;
      }
      // Letzter Fallback:
      return [];
    },

    getItemById: function(id){
      var cats = this.getCategories();
      for(var i=0;i<cats.length;i++){
        var items=cats[i].items||[];
        for(var j=0;j<items.length;j++){
          if(items[j].id===id) return items[j];
        }
      }
      return null;
    },

    getIconFor: function(id){
      var reg = _pickRegistry();
      if(reg && reg.buildings && reg.buildings[id]){
        var ui = reg.buildings[id].ui || {};
        return _normIcon(ui.icon || ui.iconPath || DEFAULT_ICON);
      }
      var item = this.getItemById(id);
      return item ? _normIcon(item.icon) : DEFAULT_ICON;
    }
  };

  window.BuildDataBridge = Bridge;
  log(MOD, 'bereit — Registry:', Bridge.hasRegistry());
})();
