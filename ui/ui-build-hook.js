/* ============================================================================
 * Datei   : ui/ui-build-hook.js
 * Version : v25.11.14-final-2
 * Zweck   : Klick im Build-Dock → Auswahl & Platzieren-Start (Ghost-Overlay)
 *
 * Lauscht : (DOM) Klicks innerhalb #build-dock
 * Sendet  : cb:build:select      { buildingId }
 *           cb:set-build-tool    { kind }                // für core.input.js
 *           req:place:begin      { buildingId, w, h }    // konsistent zum Projekt
 *           cb:build:cancel      { via:'ui' }
 *           req:place:cancel
 *
 * Hinweise:
 *  - Dock bleibt offen (kein preventDefault/stopPropagation).
 *  - Größe: DOM (data-w/h) → Registry ('building') → Fallback 1x1.
 *  - Unterstützt Karten mit data-building-id **oder** legacy data-bid.
 * ========================================================================== */
(function () {
  'use strict';

  const OK   = (m, ...a) => (window.CBLog?.ok   || console.log)   ('✅ [build-hook]', m, ...a);
  const LOG  = (m, ...a) => (window.CBLog?.info || console.info)  ('[build-hook]',   m, ...a);
  const WARN = (m, ...a) => (window.CBLog?.warn || console.warn)  ('[build-hook] ⚠', m, ...a);
  const EMIT = (n, d = {}) => window.dispatchEvent(new CustomEvent(n, { detail: d }));

  const root = document.getElementById('build-dock');
  if (!root) { console.warn('[build-hook] #build-dock fehlt – Hook inaktiv'); return; }

  function getSizeFromRegistry(id) {
    try {
      if (typeof window.Registry?.get === 'function') {
        // → Lastenheft: Registry.get(type,id) mit type 'building' (singular)
        const def = window.Registry.get('building', id);
        if (def && (def.size || (def.w && def.h))) {
          const w = def.w || def.size?.[0] || 1;
          const h = def.h || def.size?.[1] || 1;
          return { w: Math.max(1, w|0), h: Math.max(1, h|0) };
        }
      }
      // mögliche Altstruktur:
      const def2 = window.Registry?.buildings?.[id];
      if (def2) {
        const w = def2.w || def2.size?.[0] || 1;
        const h = def2.h || def2.size?.[1] || 1;
        return { w: Math.max(1, w|0), h: Math.max(1, h|0) };
      }
    } catch (e) { WARN('Registry-Abfrage fehlgeschlagen:', e?.message || e); }
    return { w: 1, h: 1 };
  }

  function resolveSize(el, id) {
    const wAttr = el.getAttribute('data-w');
    const hAttr = el.getAttribute('data-h');
    if (wAttr || hAttr) {
      const w = Math.max(1, (wAttr|0) || 1);
      const h = Math.max(1, (hAttr|0) || 1);
      return { w, h };
    }
    return getSizeFromRegistry(id);
  }

  root.addEventListener('click', (e) => {
    // Cancel im Dock
    const btnCancel = e.target.closest('[data-build-cancel]');
    if (btnCancel) {
      EMIT('cb:build:cancel', { via: 'ui' });
      EMIT('req:place:cancel');
      LOG('cancel');
      return;
    }

    // Karten (beide Varianten akzeptieren)
    const card = e.target.closest('[data-building-id], [data-bid]');
    if (!card) return;

    const id = card.getAttribute('data-building-id') || card.getAttribute('data-bid');
    if (!id) return;

    const { w, h } = resolveSize(card, id);

    // a) UI-Feedback (Inspector/Logs)
    EMIT('cb:build:select', { buildingId: id });
    // b) Build-Tool aktivieren → core.input.js setzt Cursor & verarbeitet Klick
    EMIT('cb:set-build-tool', { kind: id });
    // c) Ghost/Preview anstoßen (Projekt-konform: req:place:BEGIN)
    EMIT('req:place:begin', { buildingId: id, w, h });

    LOG('select', id, `→ begin ${w}x${h}`);
  });

  OK('aktiv v25.11.14-final-2');
})();
