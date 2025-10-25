/* ============================================================================
 * Datei   : core/production.res-validate.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-1
 * Zweck   : Einmalige Validierung der Live-Ressourcenwerte (RegistryValues)
 *           – Alle in der Registry definierten Ressourcen müssen in RegistryValues existieren.
 *           – Fehlende Keys werden automatisch auf 0 gesetzt.
 *           – Danach Snapshot-Event feuern (HUD/Inspector sehen den Stand sofort).
 *
 * Lauscht : cb:registry:ready, cb:hud-ready, cb:boot:ready, cb:game:start
 * Sendet  : cb:res:snapshot (nur 1x direkt nach Korrektur)
 *
 * Einbindung (index.html – NACH registry.js, VOR ui-hud.js / production):
 *   <script src="core/registry.js"></script>
 *   <script src="core/production.res-validate.js"></script>
 *   <script src="ui/ui-hud.js"></script>
 *   <!-- ... -->
 * ========================================================================== */

(() => {
  'use strict';

  /* ============================== [KONSTANTEN] ============================== */
  const TAG  = '[res-validate]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);
  const ERR  = (window.CBLog?.error || console.error).bind(console, TAG);

  /* =========================== [HILFSFUNKTIONEN] =========================== */

  // Union aus Definitionsliste (Registry) und bisheriger Werte-Map (RegistryValues)
  function getDefs() {
    try {
      const R = (window.Registry ?? {});
      const list = (typeof R.list === 'function') ? R.list('resources') : (R.data?.resources || []);
      // Hinweis: R.data.resources ist bei uns die Werte-Map → daher nur wenn list() nicht existiert:
      if (Array.isArray(list)) return list.map(r => r.id).filter(Boolean);
    } catch(e) { /* ignore */ }
    // Fallback: Keys aus Werte-Map
    return Object.keys(window.RegistryValues || {});
  }

  function ensureValuesFor(defIds) {
    const V = (window.RegistryValues = window.RegistryValues || {});
    const missing = [];
    for (const id of defIds) {
      if (V[id] == null) { V[id] = 0; missing.push(id); }
    }
    return { V, missing };
  }

  function emit(type, detail = {}) {
    try { window.dispatchEvent(new CustomEvent(type, { detail })); } catch(_) {}
    try { document.dispatchEvent(new CustomEvent(type, { detail })); } catch(_) {}
  }

  /* ============================== [HAUPTLOGIK] ============================== */

  let done = false; // nur einmal pro Seite

  function validateOnce(origin){
    if (done) return;
    try {
      const defs = getDefs(); // IDs aus Registry-Definitionsliste
      if (!defs.length) {
        WARN('Keine Resource-Definitionsliste gefunden (noch zu früh?). Ursprung:', origin);
        return;
      }

      const { V, missing } = ensureValuesFor(defs);
      if (missing.length) {
        WARN('Fehlende Ressourcenwerte → auf 0 gesetzt:', missing.join(', '));
      }

      // Spiegel unter Registry.data.resources (Map) aktualisieren (nur Sicherung)
      try {
        const R = (window.Registry = window.Registry || {});
        R.data = R.data || {};
        R.data.resources = V;
      } catch(e) { /* ignore */ }

      // Für HUD/Inspector direkt den aktuellen Stand melden
      emit('cb:res:snapshot', { resources: V });

      LOG(`Validierung ok (Keys: ${Object.keys(V).length})`);
      done = true;
    } catch(e) {
      ERR('Validierung fehlgeschlagen:', e?.message || e);
    }
  }

  // Wir triggern an mehreren „sicheren“ Punkten – der erste Treffer macht die Arbeit:
  addEventListener('cb:registry:ready', () => validateOnce('registry-ready'));
  addEventListener('cb:boot:ready',     () => validateOnce('boot-ready'));
  addEventListener('cb:hud-ready',      () => validateOnce('hud-ready'));
  addEventListener('cb:game:start',     () => validateOnce('game-start'));

  // Falls alles schon fertig ist (Reload im späten Zustand):
  if (window.Registry?.__ready) setTimeout(() => validateOnce('late-init'), 0);
})();
