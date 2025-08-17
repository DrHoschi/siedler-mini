// ==========================================
// terrain.js
// Zeichnet den Untergrund (Boden, Pfade, Wasser, etc.)
// ==========================================

import { terrainTextures } from "./assets.js";

// Hilfsfunktion zum Laden von Bildern
function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}

// Alle Terrain-Bilder laden
const terrainImages = {
    grass: loadImage(terrainTextures.grass),
    dirt: loadImage(terrainTextures.dirt),
    stone: loadImage(terrainTextures.stone),
    water: loadImage(terrainTextures.water),
    path0: loadImage(terrainTextures.path0),
    path1: loadImage(terrainTextures.path1),
    path2: loadImage(terrainTextures.path2)
};

// ==========================================
// Funktion: Terrain zeichnen
// map = 2D Array mit Feldtypen ("grass", "dirt", etc.)
// ctx = CanvasRenderingContext2D
// tileSize = Größe eines Feldes in Pixeln
// ==========================================
export function drawTerrain(map, ctx, tileSize) {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const tileType = map[y][x];
            const img = terrainImages[tileType] || terrainImages.grass; 
            ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }
}

// Export der geladenen Images
export { terrainImages };
