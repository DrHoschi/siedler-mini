/* ============================================================================
 * Datei   : ui/ui-build-hook.js
 * Version : v25.11.14-final
 * Zweck   : Klick im Build-Dock → Auswahl & Platzieren-Start (Ghost-Overlay)
 *
 * Lauscht : (DOM) Klicks innerhalb #build-dock
 * Sendet  : cb:build:select {buildingId}
 *           cb:build:cancel {via:'ui'}
 *           req:place:start {buildingId, w, h}
 *           req:place:cancel
 *
 * Hinweise:
 *  - Das Baumenü bleibt offen (kein preventDefault/stopPropagation).
 *  - w/h werden bevorzugt von data-Attributen gelesen (data-w / data-h),
 *    ansonsten aus Registry heuristisch ermittelt, fallback 1x1.
 *  - Cancel im Dock beendet auch ein evtl. aktives Platzieren.
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------ Logging --------------------------------- */
  const OK   = (m, ...a) => (window.CBLog?.ok   || console.log)   ('✅ [build-hook]', m, ...a);
  const LOG  = (m, ...a) => (window.CBLog?.info || console.info)  ('[build-hook]', m, ...a);
  const WARN = (m, ...a) => (window.CBLog?.warn || console.warn)  ('[build-hook]', m, ...a);
  const EMIT = (n, d = {}) => window.dispatchEvent(new CustomEvent(n, { detail: d }));

  /* ---------------------------- DOM-Referenz ------------------------------ */
  const root = document.getElementById('build-dock');
  if (!root) { console.warn('[build-hook] #build-dock fehlt – Hook inaktiv'); return; }

  /* -------------------------- Registry-Hilfen ----------------------------- */
  function getSizeFromRegistry(id) {
    try {
      // 1) Falls Registry ein Lookup hat (häufiges Muster)
      if (typeof window.Registry?.get === 'function') {
        const def = window.Registry.get('buildings', id);
        if (def && (def.size || (def.w && def.h))) {
          const w = def.w || def.size?.[0] || 1;
          const h = def.h || def.size?.[1] || 1;
          return { w: Math.max(1, w|0), h: Math.max(1, h|0) };
        }
      }
      // 2) Direct map: Registry.buildings[id] {size:[w,h]} / {w,h}
      const def2 = window.Registry?.buildings?.[id];
      if (def2) {
        const w = def2.w || def2.size?.[0] || 1;
        const h = def2.h || def2.size?.[1] || 1;
        return { w: Math.max(1, w|0), h: Math.max(1, h|0) };
      }
    } catch (e) {
      WARN('Registry-Abfrage fehlschlagen:', e?.message || e);
    }
    return { w: 1, h: 1 };
  }

  function resolveSize(el, id) {
    // Priorität: Daten aus DOM → Registry → Fallback
    const wAttr = el.getAttribute('data-w');
    const hAttr = el.getAttribute('data-h');
    if (wAttr || hAttr) {
      const w = Math.max(1, (wAttr|0) || 1);
      const h = Math.max(1, (hAttr|0) || 1);
      return { w, h };
    }
    return getSizeFromRegistry(id);
  }

  /* ------------------------------ Events ---------------------------------- */
  root.addEventListener('click', (e) => {
    // Cancel-Button im Dock?
    const btnCancel = e.target.closest('[data-build-cancel]');
    if (btnCancel) {
      EMIT('cb:build:cancel', { via: 'ui' });
      EMIT('req:place:cancel');
      LOG('cancel');
      return; // Menü bleibt offen
    }

    // Karten-Klick?
    const card = e.target.closest('[data-building-id]');
    if (!card) return;

    const id = card.getAttribute('data-building-id');
    if (!id) return;

    // Größe ermitteln
    const { w, h } = resolveSize(card, id);

    // 1) UI-Rückmeldung für Logs/Tabs
    EMIT('cb:build:select', { buildingId: id });
    // 2) Platzieren starten (Ghost-Overlay)
    EMIT('req:place:start', { buildingId: id, w, h });

    LOG('select', id, `→ place ${w}x${h}`);
  });

  OK('aktiv v25.11.14-final');
})();
