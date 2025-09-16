<script>
// ============================================================================
// registry.json-adapter.js  (v1.0.9)
// Lädt assets/data/buildings.json und registriert unter "buildings" (Plural).
// Sendet: cb:registry:ready (1x), cb:registry:update bei jeder Übernahme.
// ============================================================================
(function () {
  'use strict';

  var LOG = (window.CBLog && CBLog.info) ? CBLog : console;
  var sentReady = false;

  // ---- Pfad(e) für die Daten
  var CANDIDATES = [
    'assets/data/buildings.json'  // <- unser kanonischer Pfad
  ];

  function dispatch(tag, detail) {
    try { window.dispatchEvent(new CustomEvent(tag, { detail: detail||{} })); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent(tag, { detail: detail||{} })); } catch (e) {}
  }

  function applyBuildings(payload, sourcePath) {
    var data = payload || {};
    var list = Array.isArray(data.buildings) ? data.buildings : [];
    // Registry vorhanden?
    if (!window.Registry || typeof window.Registry.register !== 'function') {
      LOG.warn('[registry.json-adapter] Registry nicht verfügbar – verschiebe Apply.');
      // Später noch einmal versuchen
      setTimeout(function(){ applyBuildings(payload, sourcePath); }, 30);
      return;
    }

    try {
      window.Registry.register('buildings', list);
      LOG.info('[registry.json-adapter] applied %d buildings aus %s', list.length, sourcePath);
    } catch (e) {
      LOG.warn('[registry.json-adapter] Konnte buildings nicht registrieren:', e);
    }

    // Events
    var counts = {
      categories: (window.Registry.list && window.Registry.list('categories') || []).length,
      buildings:  list.length
    };
    dispatch('cb:registry:update', { source:'json-adapter', counts: counts });

    if (!sentReady) {
      sentReady = true;
      dispatch('cb:registry:ready',  { source:'json-adapter', counts: counts });
      // Für Assets-abhängige UI die frühzeitig loslegt:
      dispatch('cb:assets-ready',     { source:'json-adapter' });
    }
  }

  function tryLoad(i) {
    if (i >= CANDIDATES.length) {
      LOG.warn('[registry.json-adapter] Keine buildings.json gefunden.');
      return;
    }
    var url = CANDIDATES[i] + (CANDIDATES[i].includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(Date.now());
    fetch(url, { cache:'no-store' })
      .then(function(r){
        if (!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      })
      .then(function(json){
        LOG.info('[registry.json-adapter] geladen: %s', CANDIDATES[i]);
        applyBuildings(json, CANDIDATES[i]);
      })
      .catch(function(err){
        LOG.warn('[registry.json-adapter] Fehler beim Laden %s → %s', CANDIDATES[i], err && err.message);
        tryLoad(i+1);
      });
  }

  LOG.info('[registry.json-adapter] Modul geladen v1.0.9');
  // Früh starten – Registry wird beim Apply geprüft
  tryLoad(0);
})();
</script>
