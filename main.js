// main.js – V12 mit Panning-Fix und Bau-Check

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Kamera und Zoom
let camX = 0;
let camY = 0;
let zoom = 1;

// Panning Steuerung
let isPanning = false;
let panStart = { x: 0, y: 0 };
let camStart = { x: 0, y: 0 };

// Tile-Größe (für isometrische Darstellung)
const tileWidth = 128;
const tileHeight = 64;

// Spielkarten-Daten
const mapWidth = 30;
const mapHeight = 30;
let mapTiles = [];

// Aktives Werkzeug
let tool = 'select'; // 'select', 'road', 'hq', 'lumberjack'

// Assets laden
const textures = {};
const textureFiles = [
    "grass.png",
    "grass_flowers.png",
    "dirt.png",
    "rocky.png",
    "sand.png",
    "water.png",
    "shore.png",
    "hq_wood.png",
    "lumberjack.png",
    "road_straight.png",
    "road_curve.png",
    "depot.png"
];

function loadTextures() {
    let loaded = 0;
    return new Promise(resolve => {
        textureFiles.forEach(file => {
            const img = new Image();
            img.src = `assets/${file}`;
            img.onload = () => {
                loaded++;
                if (loaded === textureFiles.length) {
                    resolve();
                }
            };
            textures[file] = img;
        });
    });
}

// Karte initialisieren
function generateMap() {
    for (let y = 0; y < mapHeight; y++) {
        mapTiles[y] = [];
        for (let x = 0; x < mapWidth; x++) {
            mapTiles[y][x] = { type: "grass", building: null };
        }
    }
}

// Zeichnen
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const screenX = (x - y) * tileWidth / 2 * zoom + camX + canvas.width / 2;
            const screenY = (x + y) * tileHeight / 2 * zoom + camY;
            ctx.drawImage(textures["grass.png"], screenX, screenY, tileWidth * zoom, tileHeight * zoom);

            if (mapTiles[y][x].building) {
                ctx.drawImage(textures[mapTiles[y][x].building], screenX, screenY - 40 * zoom, tileWidth * zoom, tileHeight * zoom);
            }
        }
    }
}

// Bauen
function handleClick(e) {
    const worldPos = screenToTile(e.clientX, e.clientY);
    const tile = mapTiles[worldPos.y] && mapTiles[worldPos.y][worldPos.x];
    if (tile) {
        if (tool === 'road') tile.building = 'road_straight.png';
        if (tool === 'hq') tile.building = 'hq_wood.png';
        if (tool === 'lumberjack') tile.building = 'lumberjack.png';
    }
}

// Screen-zu-Tile-Umrechnung
function screenToTile(screenX, screenY) {
    const worldX = (screenX - camX - canvas.width / 2) / zoom;
    const worldY = (screenY - camY) / zoom;
    let tx = Math.floor((worldY / (tileHeight / 2) + worldX / (tileWidth / 2)) / 2);
    let ty = Math.floor((worldY / (tileHeight / 2) - worldX / (tileWidth / 2)) / 2);
    return { x: tx, y: ty };
}

// UI und Events
function setupUI() {
    // Maus
    canvas.addEventListener('mousedown', e => {
        if (tool === 'select' || e.button !== 0) {
            // Panning starten
            isPanning = true;
            panStart.x = e.clientX;
            panStart.y = e.clientY;
            camStart.x = camX;
            camStart.y = camY;
        } else {
            // Bauaktion
            handleClick(e);
        }
    });

    canvas.addEventListener('mousemove', e => {
        if (isPanning) {
            camX = camStart.x + (e.clientX - panStart.x);
            camY = camStart.y + (e.clientY - panStart.y);
        }
    });

    canvas.addEventListener('mouseup', () => isPanning = false);
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Zoom mit Maus
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const worldBeforeZoom = screenToTile(mouseX, mouseY);
        if (e.deltaY < 0) zoom *= zoomFactor;
        else zoom /= zoomFactor;
        const worldAfterZoom = screenToTile(mouseX, mouseY);
        camX += (worldAfterZoom.x - worldBeforeZoom.x) * tileWidth / 2 * zoom;
        camY += (worldAfterZoom.y - worldBeforeZoom.y) * tileHeight / 2 * zoom;
    }, { passive: false });

    // Touch für iPad
    let lastTouchDist = null;
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            isPanning = true;
            panStart.x = e.touches[0].clientX;
            panStart.y = e.touches[0].clientY;
            camStart.x = camX;
            camStart.y = camY;
        } else if (e.touches.length === 2) {
            lastTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    });

    canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && isPanning) {
            camX = camStart.x + (e.touches[0].clientX - panStart.x);
            camY = camStart.y + (e.touches[0].clientY - panStart.y);
        } else if (e.touches.length === 2 && lastTouchDist !== null) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (dist > lastTouchDist) zoom *= 1.05;
            else zoom /= 1.05;
            lastTouchDist = dist;
        }
    });

    canvas.addEventListener('touchend', e => {
        if (e.touches.length < 2) lastTouchDist = null;
        if (e.touches.length === 0) isPanning = false;
    });

    // Werkzeugbuttons
    document.getElementById("btnSelect").addEventListener("click", () => tool = 'select');
    document.getElementById("btnRoad").addEventListener("click", () => tool = 'road');
    document.getElementById("btnHQ").addEventListener("click", () => tool = 'hq');
    document.getElementById("btnLumberjack").addEventListener("click", () => tool = 'lumberjack');
}

// Game Loop
function gameLoop() {
    drawMap();
    requestAnimationFrame(gameLoop);
}

// Start
(async function () {
    await loadTextures();
    generateMap();
    setupUI();
    gameLoop();
})();
