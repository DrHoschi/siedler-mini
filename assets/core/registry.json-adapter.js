/* ============================================================================
 * registry.json-adapter.js – Icons & Buildings in Registry einpflegen
 * Erwartet ein globales JSON-Objekt __REGISTRY_JSON oder lädt es selbst.
 * Hier: nur die Einpflegelogik (du hast das Laden schon).
 * ========================================================================== */
(function (global) {
  'use strict';
  var MOD = '[registry.json-adapter]';
  var logI = (global.CBLog?.info || console.log).bind(console, MOD);
  var data = global.__REGISTRY_JSON; // <- falls du es vorher geladen hast

  if (!global.Registry) return;

  try {
    if (data?.iconsBase) {
      // leicht zugänglich machen für die Bridge
      global.Registry.meta = global.Registry.meta || {};
      global.Registry.meta.iconsBase = data.iconsBase;
      // optional auch global, falls jemand es außerhalb braucht
      global.__REGISTRY_ICONS_BASE = data.iconsBase;
    }

    (data?.buildings || []).forEach(function(b){
      // ui.icon vorbelegen, wenn icon vorhanden
      if (b.icon && (!b.ui || !b.ui.icon)) {
        b.ui = b.ui || {};
        // NICHT hier joinen – Bridge kann dynamisch joinen
        // trotzdem als Info ablegen:
        b.ui.icon = b.ui.icon || b.icon; 
      }
      global.Registry.upsert('buildings', b);
    });

    // freundliches Log (Counts holt sich Registry selbst)
    logI('applied', (data?.buildings||[]).length, 'buildings');
    // Falls dein Adapter bisher ein Ready-Event feuert, lass das bestehen.
    // (cb:registry:ready wird sowieso bereits von registry.js beim Init gesendet)
  } catch (e) {
    (global.CBLog?.error || console.error)(MOD, 'Fehler im Adapter', e);
  }
})(window);
