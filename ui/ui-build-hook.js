/* ============================================================================
 * Datei   : ui/ui-build-hook.js
 * Version : v25.11.13-final-3
 * Zweck   : Klick im Build-Dock → cb:build:select / Abbrechen → cb:build:cancel
 * Hinweis : Kein preventDefault/stopPropagation → Menü bleibt bedienbar.
 * ========================================================================== */
(function () {
  'use strict';
  const OK  = (m,...a)=>(window.CBLog?.ok||console.log)('✅ [build-hook]', m, ...a);
  const LOG = (m,...a)=>(window.CBLog?.info||console.info)('[build-hook]', m, ...a);
  const EMIT= (n,d={})=>window.dispatchEvent(new CustomEvent(n,{detail:d}));

  const root = document.getElementById('build-dock');
  if (!root) { console.warn('[build-hook] #build-dock fehlt – Hook inaktiv'); return; }

  root.addEventListener('click', (e) => {
    const btnCancel = e.target.closest('[data-build-cancel]');
    if (btnCancel) { EMIT('cb:build:cancel', { via:'ui' }); LOG('cancel'); return; }

    const el = e.target.closest('[data-building-id]');
    if (!el) return;
    const id = el.getAttribute('data-building-id');
    if (!id) return;
    EMIT('cb:build:select', { buildingId: id });
    LOG('select', id);
  });

  OK('aktiv v25.11.13-final-3');
})();
