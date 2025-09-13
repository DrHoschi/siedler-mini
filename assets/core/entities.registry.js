/* ============================================================================
 * Datei: assets/core/entities.registry.js
 * Version: v1.0.0
 * Projekt: Neue Siedler
 *
 * Zweck:
 *  - Zentrale Registry für Gebäude/Entities
 *  - Einheitliche Quelle für: Kategorie, Sprite-Pfad, Farben, Aliase
 *  - Bietet API für Core/Renderer/UI:
 *      - getCategoryForKind(kind)
 *      - getColorForCategory(cat)
 *      - resolveSprite(kind)
 *      - registerKind({ kind, category, sprite })
 *      - alias(from, to)
 *
 * Hinweise:
 *  - Pfade sind an die aktuelle Repository-Struktur angepasst (filelist).
 *  - HQ liegt noch unter assets/tex/... → wird hier bewusst so verdrahtet.
 * ============================================================================ */

(() => {
  'use strict';

  const TAG = '[entities.registry]';
  const log  = (...a) => (window.CBLog?.info  || console.log)(TAG, ...a);
  const warn = (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a);

  if (window.EntitiesRegistry) {
    warn('bereits initialisiert – übersprungen.');
    return;
  }

  const registry = {
    // Kategorie → Farbe (UI/Placeholder, KEIN Rot/Grün!)
    colors: {
      verwaltung: 'rgba(52, 152, 219, 0.85)',   // blau
      nahrung:    'rgba(241, 196, 15, 0.85)',   // gelb
      ressourcen: 'rgba(230, 126, 34, 0.85)',   // orange
      wohnen:     'rgba(142, 68, 173, 0.85)',   // violett
      militaer:   'rgba(127, 140, 141, 0.85)',  // grau
      default:    'rgba(149, 165, 166, 0.85)'
    },

    // kind → { category, sprite }
    kinds: Object.create(null),

    // alias map (z. B. steinmetz ↔ stonecutter)
    aliases: Object.create(null),

    // API
    getColorForCategory(cat) {
      return this.colors[cat] || this.colors.default;
    },
    getCategoryForKind(kind) {
      const k = this.resolveKindKey(kind);
      return this.kinds[k]?.category || 'default';
    },
    resolveSprite(kind) {
      const k = this.resolveKindKey(kind);
      return this.kinds[k]?.sprite || null;
    },
    resolveKindKey(kind) {
      if (!kind) return '';
      const k = String(kind).toLowerCase();
      return this.aliases[k] || k;
    },
    registerKind({ kind, category, sprite }) {
      if (!kind) return;
      const k = String(kind).toLowerCase();
      this.kinds[k] = { category: category || 'default', sprite: sprite || null };
    },
    alias(from, to) {
      if (!from || !to) return;
      this.aliases[String(from).toLowerCase()] = String(to).toLowerCase();
    }
  };

  // ------------------------------------------------------------------------
  // Bootstrap: bekannte Gebäude eintragen (an deine Datei-Struktur angepasst)
  // ------------------------------------------------------------------------
  const add = (kind, category, sprite) => registry.registerKind({ kind, category, sprite });

  // Verwaltung
  add('rathaus',     'verwaltung', 'assets/buildings/rathaus_wood1.png');
  add('depot',       'verwaltung', 'assets/buildings/depot_wood.png');

  // Nahrung
  add('fisher',      'nahrung',    'assets/buildings/fischer_wood1.png');
  add('farm',        'nahrung',    'assets/buildings/farm_wood.png');
  add('baecker',     'nahrung',    'assets/buildings/baecker_wood.png');

  // Ressourcen
  add('lumberjack',  'ressourcen', 'assets/buildings/lumberjack_wood.png');
  add('stonecutter', 'ressourcen', 'assets/buildings/steinmetz_wood.png');
  add('smith',       'ressourcen', 'assets/buildings/schmied_wood0.png');
  add('windmill',    'ressourcen', 'assets/buildings/windmuehle_wood.png');

  // Wohnen
  add('house',       'wohnen',     'assets/buildings/wohnhaus_wood0_ug0.png');

  // Militär
  add('guardtower',  'militaer',   'assets/buildings/wachturm_wood.png');
  // HQ liegt (noch) nicht unter assets/buildings → Fallback auf tex-Ordner:
  add('hq',          'militaer',   'assets/building/hq_wood.png');

  // Aliase (englisch ↔ deutsch usw.)
  registry.alias('steinmetz', 'stonecutter');
  registry.alias('wachtturm', 'guardtower'); // falls mal mit tt geschrieben
  registry.alias('wachturm',  'guardtower'); // falls UI deutsch
  registry.alias('muehle',    'windmill');
  registry.alias('schmiede',  'smith');

  // Expose
  window.EntitiesRegistry = registry;
  log(`bereit v1.0.0 (Kategorien: ${Object.keys(registry.colors).length} , Gebäude: ${Object.keys(registry.kinds).length} )`);
})();
