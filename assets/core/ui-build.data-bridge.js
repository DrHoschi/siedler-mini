<script>
/* ============================================================================
 * UI-Build Data-Bridge
 * v17.0.9 – liest 'buildings' (PLURAL) aus Registry und füttert ui-build.js
 * ========================================================================== */
(function(){
  'use strict';

  var LOG  = (window.CBLog && CBLog.info) ? CBLog : console;
  var TYPE = 'buildings';  // <-- MUSS mit Adapter übereinstimmen

  function getCategories(){
    // Aus build.categories.js
    var C = (window.BuildCategories && window.BuildCategories.slice) ? window.BuildCategories.slice(0) : [];
    return C;
  }

  function getItems(){
    var R = window.Registry || {};
    var list = (R.list && R.list(TYPE)) ? R.list(TYPE) : [];
    return list;
  }

  function applyToUI(){
    var cats  = getCategories();
    var items = getItems();

    // Übergabe an CORE-UI
    if (window.UIBuild && typeof window.UIBuild.setItems === 'function') {
      window.UIBuild.setItems({ type: TYPE, items: items, categories: cats });
      LOG.info('[ui-build.data-bridge] Items gesetzt: '+items.length);
    } else {
      console.warn('[ui-build.data-bridge] UIBuild.setItems fehlt – ui-build.js geladen?');
    }
  }

  function onReadyOrUpdate(){
    try { applyToUI(); } catch(e){ console.warn('[ui-build.data-bridge] applyToUI fehlschlag', e); }
  }

  LOG.info('[ui-build.data-bridge] bereit v17.0.9');

  // Events aus dem Adapter / Registry
  window.addEventListener('cb:registry:ready',  onReadyOrUpdate);
  window.addEventListener('cb:registry:update', onReadyOrUpdate);

  // Falls der Adapter schon durch ist, trotzdem einmal versuchen
  setTimeout(onReadyOrUpdate, 0);
})();
</script>
