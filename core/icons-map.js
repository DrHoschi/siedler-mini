/* ============================================================================
 * Datei   : core/icons-map.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 * Zweck   : Zentrale Icon-Registry (Ressourcen & Varianten) + Helper
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Hauptlogik → Exports
 * Hinweise:
 *   – UMD: funktioniert als Global (window.IconMap) und optional als ES-Export.
 *   – Pfade konsistent zu Carrier/HUD: assets/icons/resources/<key>.png
 * ============================================================================ */
(function (root, factory) {
  const api = factory();
  // Global (IIFE) – Standard in deinem Core
  if (typeof root !== 'undefined') {
    root.IconMap = api; // { ICONS, DIR, resolveIcon, getIconSafe, normalizeKey }
  }
  // Optional: ES-Module Export (falls via <script type="module"> genutzt)
  try { if (typeof module !== 'undefined') module.exports = api; } catch {}
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const LOG = (...a)=> (window?.CBLog?.info ?? console.log)('[icons]', ...a);

  /* ============================
     KONSTANTEN: Basisverzeichnisse
     ============================ */
  const BASE = 'assets/icons/resources'; // <- KEIN /resources mehr dahinter!
  const DIR = {
    resources: BASE,
    transport: BASE + '/transport', // optional
    ui:        BASE + '/ui'         // optional
  };

  /* ==========================================================
     HAUPT-MAP: Kanonische Schlüssel → Varianten → Dateipfade
     (Standardisiert auf .png, konsistent mit Carrier)
     ========================================================== */
  const ICONS = {
    wood:       { de:'Holz',        aliases:['holz','res.wood'],       default:`${DIR.resources}/wood.png` },
    stone:      { de:'Stein',       aliases:['stein','res.stone'],     default:`${DIR.resources}/stone.png` },
    fish:       { de:'Fisch',       aliases:['fisch','res.fish'],      default:`${DIR.resources}/fish.png` },
    grain:      { de:'Getreide',    aliases:['weizen','res.grain'],    default:`${DIR.resources}/grain.png` },
    bread:      { de:'Brot',        aliases:['brot','res.bread'],      default:`${DIR.resources}/bread.png` },
    bricks:     { de:'Ziegel',      aliases:['ziegel','res.bricks'],   default:`${DIR.resources}/bricks.png` },
    ore:        { de:'Erz',         aliases:['erz','gems','res.ore'],  default:`${DIR.resources}/ore.png` },
    gold:       { de:'Gold',        aliases:['res.gold'],              default:`${DIR.resources}/gold.png` },
    coins:      { de:'Geld',        aliases:['geld','münzen','munzen','res.coins'], default:`${DIR.resources}/coin.png` },
    tools:      { de:'Werkzeug',    aliases:['werkzeug','res.tools'],  default:`${DIR.resources}/tools.png` },
    food:       { de:'Nahrung',     aliases:['res.food'],              default:`${DIR.resources}/food.png` },
    population: { de:'Bevölkerung', aliases:['bürger','bevoelkerung','bevölkerung','res.population'], default:`${DIR.resources}/population.png` },
    prestige:   { de:'Prestige',    aliases:['monumente','res.prestige'], default:`${DIR.resources}/prestige.png` },
    diplomacy:  { de:'Diplomatie',  aliases:['lizenz','lizensen','lizenzen','diplomacy','res.diplomacy'], default:`${DIR.resources}/diplomacy.png` },
    knowledge:  { de:'Wissen',      aliases:['bücher','buecher','res.knowledge'], default:`${DIR.resources}/knowledge.png` },
    paper:      { de:'Papierrolle', aliases:['papier','rolle','papierrolle','res.paper'], default:`${DIR.resources}/paper.png` }
  };

  /* ==========================================================
     HILFSFUNKTIONEN
     ========================================================== */
  function normalizeKey(key) {
    if (!key) return null;
    let k = String(key).trim().toLowerCase();
    // res.* Aliase direkt entschärfen
    if (k.startsWith('res.')) k = k.slice(4);

    if (ICONS[k]) return k;
    for (const canonical in ICONS) {
      const aliases = ICONS[canonical].aliases || [];
      if (aliases.map(a => String(a).toLowerCase()).includes(k)) return canonical;
    }
    return null;
  }

  /**
   * resolveIcon: Pfad anhand Key + Variante.
   * Variante 'default' ist Standard; weitere Varianten können in ICONS ergänzt werden.
   */
  function resolveIcon(key, variant = 'default') {
    const canon = normalizeKey(key);
    if (!canon) return null;
    const entry = ICONS[canon] || {};
    // 1) explizite Variante
    if (entry[variant]) return entry[variant];
    // 2) Standard
    if (entry.default) return entry.default;
    // 3) Generischer Fallback (sollte i. d. R. nicht greifen)
    return `${DIR.resources}/${canon}.png`;
  }

  /** getIconSafe: wie resolveIcon, aber garantiert ein Icon (Tools als Fallback). */
  function getIconSafe(key, variant = 'default') {
    return resolveIcon(key, variant) || ICONS.tools.default;
  }

  // Debug-Info (einmalig)
  try { LOG('bereit –', Object.keys(ICONS).length, 'Ressourcen'); } catch {}

  // Exporte
  return { ICONS, DIR, resolveIcon, getIconSafe, normalizeKey };
});
