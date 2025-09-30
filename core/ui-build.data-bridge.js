<script>
/* ============================================================================
   Datei: core/ui-build.data-bridge.js
   Projekt: Neue Siedler
   Version: v1.1.0 (2025-10-01)
   Zweck: Registry → UI-Build Bridge (Kategorien + Items)
   Änderungen:
   - FIX: 'buildings' → 'building' (Registry-Typen sind singular)
   - FIX: Kategorien-Fallback: window.BUILD_CATEGORIES || Registry('category')
   - Robustheit: wartet auf Mount + cb:registry:ready
============================================================================ */
(function(){
  'use strict';
  var LOG = (window.CBLog && CBLog.info) ? CBLog : console;
  var mounted = false;

  function regList(type){
    try{
      return (window.Registry && typeof Registry.list==='function')
        ? Registry.list(type) : [];
    }catch(e){ LOG.warn('[ui-bridge] Registry.list(%s) fail:', type, e); return []; }
  }

  function ensureMount(){
    if (mounted) return;
    if (!window.UIBuild || typeof UIBuild.mount!=='function') return;
    var host = document.querySelector('#build-panel');
    if (!host) return;
    try { UIBuild.mount(host); mounted = true; LOG.info('[ui-bridge] mount ok'); }
    catch(e){ LOG.warn('[ui-bridge] mount failed', e); }
  }

  function getCategories(){
    // 1) bevorzugt globales Datenskript (ui/build.categories.js)
    if (Array.isArray(window.BUILD_CATEGORIES) && window.BUILD_CATEGORIES.length){
      return window.BUILD_CATEGORIES;
    }
    // 2) optional: Kategorien aus Registry, falls registriert
    var cats = regList('category');
    return Array.isArray(cats) ? cats : [];
  }

  function refresh(tag){
    ensureMount();

    // Kategorien
    var cats = getCategories();
    if (window.UIBuild?.setCategories) UIBuild.setCategories(cats);

    // Items (Buildings) – **singular** Typ
    var items = regList('building').filter(function(b){ return b && b.enabled !== false; });
    if (window.UIBuild?.setItems) UIBuild.setItems(items);

    if (window.UIBuild?.rerender) { try{ UIBuild.rerender(); }catch(e){} }
    LOG.info('[ui-bridge] set %d cats / %d items (%s)', cats.length, items.length, tag||'refresh');
  }

  window.addEventListener('cb:registry:ready',  function(){ refresh('ready');  });
  window.addEventListener('cb:registry:update', function(){ refresh('update'); });

  // Falls Registry schon fertig ist oder langsam mounted:
  setTimeout(function(){ refresh('boot'); }, 50);
})();
</script>
