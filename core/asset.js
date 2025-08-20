// ============================================================================
// 📦 core/asset.js   (Beispiel-Struktur)
// ----------------------------------------------------------------------------
// Zweck:   Lädt, verwaltet und stellt Assets (Bilder, Sounds, Daten etc.)
//          für das Spiel bereit.
// Struktur: Immer in Blöcke gegliedert mit Kommentaren.
// ============================================================================

// -----------------------------------------------------------------------------
// 1. IMPORTS
// -----------------------------------------------------------------------------
/* 
   - Hier binden wir externe Module oder interne Hilfsdateien ein.
   - Alles, was von außen kommt, steht ganz oben, damit man es sofort sieht.
*/
// import { loadImage } from './loader.js';   // Beispiel


// -----------------------------------------------------------------------------
// 2. KONSTANTEN & KONFIGURATION
// -----------------------------------------------------------------------------
/*
   - Statische Daten wie Pfade, Dateinamen, Standardwerte
   - Zentral hier abgelegt, damit leicht änderbar
*/
const ASSET_PATH = './assets/';

const IMAGE_LIST = {
  player: 'sprites/player.png',
  enemy: 'sprites/enemy.png',
  terrain: 'tiles/terrain.png',
};


// -----------------------------------------------------------------------------
// 3. HILFSFUNKTIONEN
// -----------------------------------------------------------------------------
/*
   - Kleine Funktionen, die man mehrfach im Code braucht
   - z. B. Loader, Konverter, Parser
*/
function loadImage(src) {
  const img = new Image();
  img.src = ASSET_PATH + src;
  return img;
}


// -----------------------------------------------------------------------------
// 4. KLASSEN / OBJEKTE
// -----------------------------------------------------------------------------
/*
   - Größere Strukturen, die im Spiel genutzt werden
   - z. B. AssetManager, Renderer, Entity
*/
class AssetManager {
  constructor(list) {
    this.assets = {};
    this.list = list;
  }

  // Lädt alle Assets aus der Liste
  loadAll() {
    for (const [key, file] of Object.entries(this.list)) {
      this.assets[key] = loadImage(file);
    }
  }

  // Gibt ein Asset zurück
  get(name) {
    return this.assets[name];
  }
}


// -----------------------------------------------------------------------------
// 5. INITIALISIERUNG / HAUPTLOGIK
// -----------------------------------------------------------------------------
/*
   - Hier wird der Code ausgeführt, der direkt beim Laden laufen soll
   - z. B. Initialisierung vom AssetManager
*/
const assetManager = new AssetManager(IMAGE_LIST);
assetManager.loadAll();


// -----------------------------------------------------------------------------
// 6. EXPORTS
// -----------------------------------------------------------------------------
/*
   - Alles, was in anderen Dateien gebraucht wird, exportieren
   - So bleibt die Struktur modular und wiederverwendbar
*/
export { assetManager, AssetManager, IMAGE_LIST };
