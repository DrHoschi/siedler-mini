/* ============================================================================
 * Datei   : ui/ui-build-hook.js
 * Version : v25.11.09-final
 * Zweck   : Klick im Build-Dock → Auswahl & Platzieren-Start (mit w/h)
 * Fix     : Doppeltes IIFE & LOG-Fehlposition entfernt, Fallback 3×3
 * ========================================================================== */
(function () {
  'use strict';
  const OK   = (m, ...a) => (window.CBLog?.ok   || console.log)   ('✅ [build-hook]', m, ...a);
  const LOG  = (m, ...a) => (window.CBLog?.info || console.info)  ('[build-hook]',   m, ...a);
  const WARN = (m, ...a) => (window.CBLog?.warn || console.warn)  ('[build-hook] ⚠', m, ...a);
  const EMIT = (n, d = {}) => window.dispatchEvent(new CustomEvent(n, { detail: d }));

  const root = document.getElementById('build-dock');
  if (!root) { console.warn('[build-hook] #build-dock fehlt – Hook inaktiv'); return; }

  function resolveSize(el, id){
    const wAttr = el.getAttribute('data-w');
    const hAttr = el.getAttribute('data-h');
    if (wAttr || hAttr) {
      return { w: Math.max(1,(wAttr|0)||1), h: Math.max(1,(hAttr|0)||1) };
    }
    try {
      const def = window.Registry?.get?.('building', id);
      if (def){
        const w = def.w || (def.size?.[0]||0);
        const h = def.h || (def.size?.[1]||0);
        if (w && h) return { w:w|0, h:h|0 };
      }
    } catch {}
    return { w:3, h:3 }; // letzter Fallback
  }

  root.addEventListener('click', (e)=>{
    const card = e.target.closest('[data-building-id],[data-bid]'); if (!card) return;
    const id = card.getAttribute('data-building-id') || card.getAttribute('data-bid'); if (!id) return;

    const { w, h } = resolveSize(card, id);

    EMIT('cb:build:select',   { buildingId: id });
    EMIT('cb:set-build-tool', { kind: id });
    EMIT('req:place:begin',   { buildingId: id, w, h });

    LOG('select', id, `→ begin ${w}x${h}`);
  });

  OK('aktiv v25.11.09-final');
})();
