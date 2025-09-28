<script>
/*!
 * Registry – zentrale, in-Memory Ablage für Kategorien & Gebäude
 * Version: v1.2.4
 * Pfad: assets/core/registry.js
 */
(function (w) {
  'use strict';

  const TYPES = new Set(['categories', 'buildings']); // ← exakt diese Keys
  const _store = {
    categories: [],   // [{ id, name, order }]
    buildings: []     // [{ id, name, cat, icon, sprite, enabled, size, place }]
  };

  const log = (msg, ...rest) =>
    (w.CBLog?.info || console.log).call(console, `[registry] ${msg}`, ...rest);

  function _valid(type) {
    if (!TYPES.has(type)) {
      (w.CBLog?.warn || console.warn)(`[registry] list(): unbekannte Art ${type}`);
      return false;
    }
    return true;
  }

  const API = {
    version: '1.2.4',

    clear() {
      _store.categories = [];
      _store.buildings  = [];
      w.dispatchEvent(new CustomEvent('cb:registry:update', {
        detail: { counts: API.counts(), reason: 'clear' }
      }));
    },

    /** Registriert ein Array für einen bekannten Typ (überschreibt komplett). */
    register(type, arr) {
      if (!_valid(type)) return;
      _store[type] = Array.isArray(arr) ? arr.slice() : [];
      w.dispatchEvent(new CustomEvent('cb:registry:update', {
        detail: { counts: API.counts(), type, reason: 'register' }
      }));
    },

    /** Fügt Elemente hinzu (append). */
    add(type, arr) {
      if (!_valid(type)) return;
      if (!Array.isArray(arr) || arr.length === 0) return;
      _store[type].push(...arr);
      w.dispatchEvent(new CustomEvent('cb:registry:update', {
        detail: { counts: API.counts(), type, reason: 'add' }
      }));
    },

    /** Liefert Kopie der Liste. */
    list(type) {
      if (!_valid(type)) return [];
      return _store[type].slice();
    },

    /** Sucht ein Element nach id in einem Typ. */
    get(type, id) {
      if (!_valid(type)) return undefined;
      return _store[type].find(x => x.id === id);
    },

    counts() {
      return {
        categories: _store.categories.length,
        buildings:  _store.buildings.length
      };
    }
  };

  // Exponieren
  w.Registry = API;
  log(`bereit v${API.version} (Kategorien: ${API.counts().categories} , Gebäude: ${API.counts().buildings})`);
})(window);
</script>
