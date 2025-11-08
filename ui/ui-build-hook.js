/* ============================================================================
 * Datei   : ui/ui-build-hook.js
 * Version : v25.11.13-final-2
 * Zweck   : Klicks im Build-Dock → cb:build:select / cb:build:cancel
 * Hinweis : Kein preventDefault auf UI – Menü bleibt bedienbar.
 * ========================================================================== */
(function () {
  'use strict';
  const emit = (n,d={})=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  const log  = (m,...a)=>(window.CBLog?.info||console.info)('[build-hook]',m,...a);

  const root = document.getElementById('build-dock');
  if (!root) { console.warn('[build-hook] #build-dock fehlt'); return; }

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
