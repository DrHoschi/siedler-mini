/* ============================================================================
 * Datei   : inspector/inspector.tabs.adapter.js
 * Version : v1.0.0 (2025-10-31)
 * Zweck   : Kompatibilitäts-Adapter: Tabs bequem registrieren, egal wann sie laden.
 * API     : window.registerInspectorTab(name, renderFn)
 * Hinweise: Muss NACH ui-inspector.content-v1.js und VOR den Tab-Dateien geladen werden.
 * ========================================================================== */

(function () {
  const q = []; // Warteschlange {name, fn}
  const hasContent = () => !!window.InspectorContent && typeof window.InspectorContent.register === 'function';

  // Globale Registrier-Funktion für alle Tabs (Legacy-freundlich)
  window.registerInspectorTab = function (name, renderFn) {
    if (!name || typeof renderFn !== 'function') return;
    if (hasContent()) {
      try {
        window.InspectorContent.register(name, renderFn);
        window.InspectorContent.mount(); // stellt sicher, dass UI aktualisiert
      } catch (e) {
        console.warn('[insp-adapter] register failed for', name, e);
      }
    } else {
      q.push({ name, fn: renderFn });
    }
  };

  // Wenn die Content-Schicht später bereit ist, alles nachregistrieren
  const drain = () => {
    if (!hasContent() || !q.length) return;
    const items = q.splice(0, q.length);
    for (const { name, fn } of items) {
      try { window.InspectorContent.register(name, fn); }
      catch (e) { console.warn('[insp-adapter] deferred register failed for', name, e); }
    }
    window.InspectorContent.mount();
  };

  // Mehrere Trigger, um „bereit“ zu erkennen
  window.addEventListener('cb:insp:content:ready', drain);
  window.addEventListener('req:insp:content:mount', drain);
  // Fallback: beim DOM ready versuchen
  if (document.readyState !== 'loading') setTimeout(drain, 0);
  else document.addEventListener('DOMContentLoaded', drain);
})();
