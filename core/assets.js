// core/world.js
import { IM } from './assets.js';

// Karten-Parameter
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const MAP_WIDTH = 100;   // Anzahl Kacheln horizontal
export const MAP_HEIGHT = 100;  // Anzahl Kacheln vertikal

// Welt-Daten (Basis: Gras)
export const worldMap = [];

export function initWorld() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            row.push({
                type: 'grass', // Standardboden
                building: null // später HQ, Holzfäller, Depot etc.
            });
        }
        worldMap.push(row);
    }

    // Beispiel: See in der Mitte
    for (let y = 45; y < 55; y++) {
        for (let x = 45; x < 55; x++) {
            if (x === 45 || x === 54 || y === 45 || y === 54) {
                worldMap[y][x].type = 'shore';
            } else {
                worldMap[y][x].type = 'water';
            }
        }
    }
}

// Bautyp setzen
export function setTileBuilding(tileX, tileY, buildingType) {
    if (tileX < 0 || tileY < 0 || tileX >= MAP_WIDTH || tileY >= MAP_HEIGHT) return;
    worldMap[tileY][tileX].building = buildingType;
}

// Kachel-Typ setzen
export function setTileType(tileX, tileY, type) {
    if (tileX < 0 || tileY < 0 || tileX >= MAP_WIDTH || tileY >= MAP_HEIGHT) return;
    worldMap[tileY][tileX].type = type;
}

// Kachel-Daten abrufen
export function getTile(tileX, tileY) {
    if (tileX < 0 || tileY < 0 || tileX >= MAP_WIDTH || tileY >= MAP_HEIGHT) return null;
    return worldMap[tileY][tileX];
}

// Welt zeichnen
export function drawWorld(ctx, camera) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Sichtbereich in Kacheln berechnen
    const startX = Math.floor(camera.x / TILE_WIDTH) - 2;
    const startY = Math.floor(camera.y / TILE_HEIGHT) - 2;
    const endX = startX + Math.ceil(camera.width / TILE_WIDTH) + 4;
    const endY = startY + Math.ceil(camera.height / TILE_HEIGHT) + 4;

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const tile = getTile(x, y);
            if (!tile) continue;

            // Bildschirm-Koordinaten (Isometrie)
            const screenX = (x - y) * (TILE_WIDTH / 2) - camera.x + ctx.canvas.width / 2;
            const screenY = (x + y) * (TILE_HEIGHT / 2) - camera.y + ctx.canvas.height / 4;

            // Boden
            const img = IM[tile.type];
            if (img) {
                ctx.drawImage(img, screenX, screenY);
            } else {
                ctx.fillStyle = 'green';
                ctx.fillRect(screenX, screenY, TILE_WIDTH, TILE_HEIGHT);
            }

            // Gebäude
            if (tile.building) {
                const buildingImg = IM[tile.building];
                if (buildingImg) {
                    ctx.drawImage(buildingImg, screenX, screenY - TILE_HEIGHT / 2);
                }
            }
        }
    }
}
