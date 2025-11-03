/* ============================================================================
 * Datei   : core/territory.js
 * Version : v25.11.03 (skeleton)
 * Zweck   : Verwaltung von Territorium (Militär & Pioniere)
 * Struktur: IMPORTS → KONSTANTEN → HILFSFUNKTIONEN → KLASSEN → HAUPTLOGIK → EXPORTS
 * Ereignisse:
 *   req:territory:expand   {by:'pioneer'|'building',at:{x,y},radius:N}
 *   cb:territory:change    {delta:{tiles:+N}, source:'pioneer'|'tower'}
 * ============================================================================
 */

const TERRITORY_RADIUS_BASE = 6;

const territoryState = {
  ownedTiles: new Set(), // kann z.B. "x:y" Strings enthalten
  total: 0
};

function addTile(x, y) {
  const key = `${x}:${y}`;
  if (!territoryState.ownedTiles.has(key)) {
    territoryState.ownedTiles.add(key);
    territoryState.total++;
  }
}

function expandTerritory(origin, radius = TERRITORY_RADIUS_BASE) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      addTile(origin.x + dx, origin.y + dy);
    }
  }
  dispatchEvent(new CustomEvent("cb:territory:change", {
    detail: { delta: { tiles: radius * radius * 4 }, source: "system" }
  }));
  console.info("[territory] erweitert:", territoryState.total, "Tiles");
}

addEventListener("req:territory:expand", e => {
  const { at = {x:0,y:0}, radius, by } = e.detail || {};
  expandTerritory(at, radius || TERRITORY_RADIUS_BASE);
});

// Export
window.Territory = { state: territoryState, expandTerritory };
