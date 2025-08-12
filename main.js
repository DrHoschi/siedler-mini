// main.js – Siedler-Mini V12.2 mit Fix für Textur-Überlagerung

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let cam = { x: 0, y: 0, z: 1 };
let mapWidth = 50;
let mapHeight = 50;
let tileSize = 64;

let tiles = [];
let selectedTool = "pointer";

const images = {};
const imageFiles = [
    "grass.png", "water.png", "shore.png", "road.png", "road_curve.png", "road_straight.png",
    "hq_wood.png", "hq_stone.png", "lumberjack.png", "depot.png", "dirt.png", "rocky.png", "sand.png"
];

function loadImages(files, callback) {
    let loaded = 0;
    files.forEach(file => {
        const img = new Image();
        img.src = `assets/${file}`;
        img.onload = () => {
            loaded++;
            if (loaded === files.length) callback();
        };
        images[file] = img;
    });
}

function initMap() {
    for (let y = 0; y < mapHeight; y++) {
        tiles[y] = [];
        for (let x = 0; x < mapWidth; x++) {
            tiles[y][x] = { type: "grass" };
        }
    }
    // Beispiel HQ in der Mitte
    tiles[25][25].type = "hq_wood";
}

function screenToIso(screenX, screenY) {
    const worldX = (screenX / cam.z - cam.x);
    const worldY = (screenY / cam.z - cam.y);
    const isoX = Math.floor((worldY / (tileSize / 2) + worldX / (tileSize / 2)) / 2);
    const isoY = Math.floor((worldY / (tileSize / 2) - worldX / (tileSize / 2)) / 2);
    return { x: isoX, y: isoY };
}

function drawTile(type, x, y) {
    const img = images[type + ".png"] || images["grass.png"];
    const isoX = (x - y) * (tileSize / 2);
    const isoY = (x + y) * (tileSize / 4);
    ctx.drawImage(img, isoX, isoY, tileSize, tileSize / 2);
}

function drawAll() {
    // 🔹 Canvas sauber leeren vor dem Zeichnen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;

    ctx.save();
    ctx.translate(canvas.width / 2, 100);
    ctx.scale(cam.z, cam.z);
    ctx.translate(cam.x, cam.y);

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            drawTile(tiles[y][x].type, x, y);
        }
    }
    ctx.restore();
}

canvas.addEventListener("click", e => {
    const pos = screenToIso(e.clientX, e.clientY);
    if (pos.x >= 0 && pos.y >= 0 && pos.x < mapWidth && pos.y < mapHeight) {
        if (selectedTool === "road") tiles[pos.y][pos.x].type = "road";
        if (selectedTool === "lumberjack") tiles[pos.y][pos.x].type = "lumberjack";
    }
});

canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const zoomAmount = e.deltaY * -0.001;
    cam.z += zoomAmount;
    cam.z = Math.min(Math.max(cam.z, 0.5), 3);
});

let isDragging = false;
let dragStart = { x: 0, y: 0 };

canvas.addEventListener("mousedown", e => {
    if (e.button === 1 || e.button === 2) {
        isDragging = true;
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
    }
});

canvas.addEventListener("mousemove", e => {
    if (isDragging) {
        cam.x += (e.clientX - dragStart.x) / cam.z;
        cam.y += (e.clientY - dragStart.y) / cam.z;
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
    }
});

canvas.addEventListener("mouseup", e => {
    if (e.button === 1 || e.button === 2) {
        isDragging = false;
    }
});

window.addEventListener("contextmenu", e => e.preventDefault());

function gameLoop() {
    drawAll();
    requestAnimationFrame(gameLoop);
}

loadImages(imageFiles, () => {
    initMap();
    gameLoop();
});
