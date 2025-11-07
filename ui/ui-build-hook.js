/* ============================================================================
 * Datei   : ui/ui-build-hook.js
 * Projekt : Neue Siedler
 * Version : v25.11.13
 * Zweck   : Klicks im BuildDock in Events übersetzen (cb:build:select/cancel)
 * Hinweis : Nicht dein Dock ersetzen – nur Event-Glue via Event-Delegation.
 * ========================================================================== */
(function () {
  const root = document.getElementById('build-dock') || document.body;
  const log = (m,...a)=> (window.CBLog?.info||console.info)('[build-hook]', m, ...a);

  function onClick(e) {
    const el = e.target.closest('[data-building-id]');
    if (!el) return;
    const id = el.getAttribute('data-building-id');
    if (!id) return;
    emit('cb:build:select', { buildingId: id });
    log('select', id);
  }

  // Cancel/Back-Button im Dock (falls vorhanden)
  function onCancel(e) {
    const el = e.target.closest('[data-build-cancel]');
    if (!el) return;
    emit('cb:build:cancel', { via: 'ui' });
    log('cancel');
  }

  root.addEventListener('click', onClick);
  root.addEventListener('click', onCancel);

  (window.CBLog?.ok||console.log)('✅ [build-hook] aktiv');
})();
