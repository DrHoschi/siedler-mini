<script>
// ============================================================================
// ui-build.data-bridge.js  (v17.0.9)
// Brücke zwischen Registry und CORE-UI-Build.
//  - liest "categories" & "buildings" (Plural!) aus Registry
//  - filtert enabled:true
//  - mounted ins #build-panel und setzt Items/Kategorien in der korrekten Reihenfolge
//  - reagiert auf cb:registry:ready / cb:registry:update
// ============================================================================
(function(){
  'use strict';

  var LOG = (window.CBLog && CBLog.info) ? CBLog : console;
  var mounted = false;

  function get(listName) {
    try {
      if (!window.Registry || typeof window.Registry.list !== 'function') return [];
      var arr = window.Registry.list(listName);
      return Array.isArray(arr) ? arr : [];
    } catch(e) {
      LOG.warn('[ui-build.data-bridge] list() fehlgeschlagen für %s', listName, e);
      return [];
    }
  }

  function ensureMount() {
    if (mounted) return;
    if (!window.UIBuild || typeof window.UIBuild.mount !== 'function') return;
    var host = document.querySelector('#build-panel');
    if (!host) return;
    try {
      window.UIBuild.mount(host);
      mounted = true;
      LOG.info('[ui-build.data-bridge] mount OK');
    } catch (e) {
      LOG.warn('[ui-build.data-bridge] mount fehlgeschlagen', e);
    }
  }

  function refresh(tag) {
    ensureMount();

    // 1) Kategorien (kommen aus build.categories.js)
    var cats = get('categories');
    if (window.UIBuild && typeof window.UIBuild.setCategories === 'function') {
      window.UIBuild.setCategories(cats);
    }

    // 2) Buildings (Plural), nur enabled
    var blds = get('buildings').filter(function(b){ return b && b.enabled !== false; });

    if (window.UIBuild && typeof window.UIBuild.setItems === 'function') {
      window.UIBuild.setItems(blds);
      LOG.info('[ui-build.data-bridge] Items gesetzt: %d (%s)', blds.length, tag||'refresh');
    }

    // Falls das Dock offen ist → neu zeichnen
    try { if (window.UIBuild && window.UIBuild.rerender) window.UIBuild.rerender(); } catch(e){}
  }

  // Events aus dem Adapter/Registry
  window.addEventListener('cb:registry:ready',  function(ev){ refresh('ready');  });
  window.addEventListener('cb:registry:update', function(ev){ refresh('update'); });

  // Falls Registry schon fertig war, trotzdem einmal versuchen
  setTimeout(function(){ refresh('boot'); }, 50);

  LOG.info('[ui-build.data-bridge] bereit v17.0.9');
})();
</script>
