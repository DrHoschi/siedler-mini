// ============================================================================
// Datei : core/icons-map.js
// Projekt: Neue Siedler
// Version: v1.0.0 (2025-10-14)
// Zweck  : Zentrale Icon-Registry (Ressourcen & Varianten) + Helper-Funktionen
// Leitplanken (User-Standards):
//  - Debug/Checker drin lassen
//  - Deutsche Kommentare, ausführlich
//  - Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
//  - Pfade konsistent; Ressourcen-Icons als .ico (16–512 px, transparent)
// ============================================================================

/* ============================
   IMPORTS (derzeit keine externen)
   ============================ */
// (leer)

/* ============================
   KONSTANTEN: Basisverzeichnisse
   ============================ */
const BASE = 'assets/icons/resources';
const DIR = {
  resources: `${BASE}/resources`,
  transport: `${BASE}/transport`,  // optionale spätere Varianten
  ui:        `${BASE}/ui`          // optionale spätere Varianten
};

/* ==========================================================
   HAUPT-MAP: Kanonische Schlüssel → Varianten → Dateipfade
   - "default": Standard-Icon (Ressource)
   - Weitere Varianten z. B. "transport" (ikonisch reduziert)
   - "de": deutscher Anzeigename (für Tooltips/Editor)
   - "aliases": akzeptierte Alternativ-Schlüssel (de/en)
   ========================================================== */
const ICONS = {
  wood:       { de: 'Holz',        aliases: ['holz'],        default: `${DIR.resources}/wood.png`,       transport: null },
  stone:      { de: 'Stein',       aliases: ['stein'],       default: `${DIR.resources}/stone.ico`,      transport: null },
  gold:       { de: 'Gold',        aliases: [],              default: `${DIR.resources}/gold.ico`,       transport: null },
  coins:      { de: 'Geld',        aliases: ['geld','münzen','munzen'], default: `${DIR.resources}/coin.ico`, transport: null },
  bricks:     { de: 'Ziegel',      aliases: ['ziegel'],      default: `${DIR.resources}/bricks.ico`,     transport: null },
  bread:      { de: 'Brot',        aliases: ['brot'],        default: `${DIR.resources}/bread.ico`,      transport: null },
  grain:      { de: 'Getreide',    aliases: ['getreide','weizen'], default: `${DIR.resources}/grain.ico`, transport: null },
  fish:       { de: 'Fisch',       aliases: ['fisch'],       default: `${DIR.resources}/fish.ico`,       transport: null },

  population: { de: 'Bevölkerung', aliases: ['bürger','bevoelkerung','bevölkerung','population'], default: `${DIR.resources}/population.ico`, transport: null },
  ore:        { de: 'Erz',         aliases: ['erz','edelsteine','gems'], default: `${DIR.resources}/ore.ico`, transport: null },
  food:       { de: 'Nahrung',     aliases: ['nahrung'],     default: `${DIR.resources}/food.ico`,       transport: null },
  prestige:   { de: 'Prestige',    aliases: ['monumente'],   default: `${DIR.resources}/prestige.ico`,   transport: null },
  weapons:    { de: 'Waffen',      aliases: ['waffen'],      default: `${DIR.resources}/weapons.ico`,    transport: null },
  diplomacy:  { de: 'Diplomatie',  aliases: ['lizenz','lizensen','lizenzen','diplomacy'], default: `${DIR.resources}/diplomacy.ico`, transport: null },
  knowledge:  { de: 'Wissen',      aliases: ['wissen','bücher','buecher'], default: `${DIR.resources}/knowledge.ico`, transport: null },
  paper:      { de: 'Papierrolle', aliases: ['papier','rolle','papierrolle'], default: `${DIR.resources}/paper.ico`, transport: null },
  tools:      { de: 'Werkzeug',    aliases: ['werkzeug','tools'], default: `${DIR.resources}/tools.ico`,  transport: null }
};

/* ==========================================================
   HILFSFUNKTIONEN
   ----------------------------------------------------------
   - normalizeKey: robustes Mapping (de/en, Kleinschreibung)
   - resolveIcon: gibt Pfad anhand key + variant zurück
   - getIconSafe: wie resolveIcon, aber mit Fallback
   ========================================================== */

/** Normalisiert Keys (de/en) und beachtet Aliase. */
function normalizeKey(key) {
  if (!key) return null;
  const k = String(key).trim().toLowerCase();

  // 1) Direkter Treffer
  if (ICONS[k]) return k;

  // 2) Alias-Tabelle durchsuchen
  for (const canonical in ICONS) {
    const { aliases = [] } = ICONS[canonical];
    if (aliases.map(a => String(a).toLowerCase()).includes(k)) return canonical;
  }
  return null;
}

/**
 * Liefert den Pfad zum Icon.
 * @param {string} key        - z. B. 'wood' oder 'Holz'
 * @param {string} [variant]  - 'default' (Standard), 'transport', 'ui' ...
 * @returns {string|null}
 */
function resolveIcon(key, variant = 'default') {
  const canon = normalizeKey(key);
  if (!canon) return null;
  const entry = ICONS[canon];
  const p = entry?.[variant] ?? entry?.default ?? null;
  return p || null;
}

/** Wie resolveIcon, aber mit sicherem Fallback (falls gewünscht anpassen). */
function getIconSafe(key, variant = 'default') {
  const p = resolveIcon(key, variant);
  if (p) return p;
  // globales Fallback – hier nehmen wir z. B. das Tools-Icon:
  return ICONS.tools.default;
}

/* ============================
   KLASSEN (derzeit nicht nötig)
   ============================ */
// (leer)

/* ============================
   HAUPTLOGIK (keine)
   ============================ */
// (leer)

/* ============================
   EXPORTS
   ============================ */
export { ICONS, DIR, resolveIcon, getIconSafe, normalizeKey };
