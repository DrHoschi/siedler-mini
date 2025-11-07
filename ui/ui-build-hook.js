/* ============================================================================
 * Datei   : ui/ui-build-hook.js
 * Version : v25.11.13-final
 * Zweck   : Klicks im Build-Dock → Events cb:build:select / cb:build:cancel
 * ========================================================================== */
(function () {
  'use strict';
  const emit = (name, detail={}) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));
  const log = (m,...a)=> (window.CBLog?.info||console.info)('[build-hook]', m, ...a);

  const root = document.getElementById('build-dock') || document.body;

  root.addEventListener('click', (e) => {
    const cancelEl = e.target.closest('[data-build-cancel]');
    if (cancelEl) { emit('cb:build:cancel', { via:'ui' }); log('cancel'); return; }

    const el = e.target.closest('[data-building-id]');
    if (!el) return;
    const id = el.getAttribute('data-building-id');
    if (!id) return;
    emit('cb:build:select', { buildingId: id });
    log('select', id);
  });

  (window.CBLog?.ok||console.log)('✅ [build-hook] aktiv');
})();
