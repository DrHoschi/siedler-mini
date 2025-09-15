/* ============================================================================
 * ui-build.data-bridge.js — Brücke Registry → UI (Bau-Menü)
 * Version: v17.0.0-rc1
 * Projekt: Siedler-Mini
 *
 * ZWECK
 *  - Einheitliche Zugriffe auf Registry-Daten (Icons, Labels, Kategorien)
 *  - Liefert konsolidierte „BuildItems“ an UI (ui-build.js)
 *  - Robust gegen fehlende Registry (Fallback auf window.BUILD_CATEGORIES)
 *
 * API (global)
 *   window.BuildDataBridge : {
 *     hasRegistry(): boolean
 *     getCategories(): Array<Category>
 *     getItemById(id): Item|null
 *     getIconFor(id): string
 *   }
 *
 * Struktur siehe build.categories.js (Category/Item).
 * ========================================================================== */
(function(){
  'use strict';
  var MOD = '[ui-build.data-bridge]';

  // ---------------------------------------------------------------------------
  // KONSTANTEN
  // ---------------------------------------------------------------------------
  var DEFAULT_ICON = 'assets/ui/build/placeholder.png';

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------
  function log(){ try { console.log.apply(console, arguments); } catch(_){} }

  function _pickRegistry(){
    return (window.Core && window.Core.Registry)
        || window.ASSET_REGISTRY
        || window.REGISTRY
        || (window.REGISTRY_BUILDINGS ? { buildings: window.REGISTRY_BUILDINGS } : null);
  }

  function _normIcon(icon){
    if(!icon) return DEFAULT_ICON;
    // Optional: kleine Normalisierung von Pfaden
    return String(icon);
  }

  // ---------------------------------------------------------------------------
  // KERN
  // ---------------------------------------------------------------------------
  var Bridge = {
    hasRegistry: function(){
      return !!_pickRegistry();
    },

    getCategories: function(){
      // Bevorzugt Registry → Kategorien ableiten (wie in build.categories.js),
      // sonst auf bereits berechnete window.BUILD_CATEGORIES zurückgreifen.
      var reg = _pickRegistry();
      if(reg && reg.buildings){
        var buildings = reg.buildings;
        var catMap = Object.create(null);

        Object.keys(buildings).forEach(function(id){
          var b = buildings[id] || {};
          var ui = b.ui || {};
          var meta = b.meta || {};
          var catId = (meta.category || 'misc').toLowerCase();

          if(!catMap[catId]){
            catMap[catId] = {
              id: catId,
              title: meta.categoryTitle || (catId.charAt(0).toUpperCase()+catId.slice(1)),
              order: typeof meta.orderCat === 'number' ? meta.orderCat : 9999,
              items: []
            };
          }
          catMap[catId].items.push({
            id: b.id || id,
            label: b.label || id,
            icon: _normIcon(ui.icon || ui.iconPath || ('assets/ui/build/' + id + '.png')),
            kind: b.kind || 'building',
            order: typeof meta.order === 'number' ? meta.order : 9999
          });
        });

        Object.keys(catMap).forEach(function(k){
          catMap[k].items.sort(function(a,b){
            var ao = (typeof a.order==='number') ? a.order : 9999;
            var bo = (typeof b.order==='number') ? b.order : 9999;
            if(ao !== bo) return ao - bo;
            return String(a.label).localeCompare(String(b.label));
          });
        });

        var categories = Object.keys(catMap).map(function(k){ return catMap[k]; })
          .sort(function(a,b){
            var ao = (typeof a.order==='number') ? a.order : 9999;
            var bo = (typeof b.order==='number') ? b.order : 9999;
            if(ao !== bo) return ao - bo;
            return String(a.title).localeCompare(String(b.title));
          });

        return categories;
      }

      // Fallback: vorhandene globale Kategorien nutzen (werden in build.categories.js erzeugt)
      return Array.isArray(window.BUILD_CATEGORIES) ? window.BUILD_CATEGORIES : [];
    },

    getItemById: function(id){
      var cats = this.getCategories();
      for(var i=0;i<cats.length;i++){
        var items = cats[i].items || [];
        for(var j=0;j<items.length;j++){
          if(items[j].id === id) return items[j];
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

  // ---------------------------------------------------------------------------
  // HAUPTLOGIK
  // ---------------------------------------------------------------------------
  window.BuildDataBridge = Bridge;
  log(MOD, 'bereit — Registry:', Bridge.hasRegistry());
})();
