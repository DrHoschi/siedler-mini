// assets/core/ui-build.data-bridge.js  — v17.0.8
(function () {
  'use strict';
  const log = (...a) => (window.CBLog?.ok || console.log)('[ui-build.data-bridge]', ...a);

  function getItems() {
    try { return window.Registry?.list?.('buildings') || []; } catch { return []; }
  }

  function apply() {
    const items = getItems();
    if (window.UIBuild?.setItems) window.UIBuild.setItems(items);
    log('Items gesetzt:', items.length);
  }

  // Auf Änderungen reagieren
  window.addEventListener('cb:registry:ready',  apply);
  window.addEventListener('cb:registry:update', apply);
  window.addEventListener('cb:assets-ready',    apply);

  // Falls die Registry schon fertig ist, direkt einmal ziehen
  if (document.readyState !== 'loading') setTimeout(apply, 0);
  else window.addEventListener('DOMContentLoaded', apply);
})();
