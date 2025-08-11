// main.js – Siedler Mini V11.1r6

// Spielfeld-Einstellungen
const TILE_SIZE = 64;
const MAP_WIDTH = 30;
const MAP_HEIGHT = 20;

let canvas, ctx;
let map = [];
let selectedTool = 'road';
let images = {};
let hqPosition = null;

// Liste aller benötigten Texturen
const textureFiles = {
    grass: 'assets/grass.png',
    water: 'assets/water.png',
    shore: 'assets/shore.png',
    dirt: 'assets/dirt.png',
    rocky: 'assets/rocky.png',
    sand: 'assets/sand.png',
    road: 'assets/road.png',
    road_straight: 'assets/road_straight.png',
    road_curve: 'assets/road_curve.png',
    hq_wood: 'assets/hq_wood.png',
    hq_stone: 'assets/hq_stone.png',
    lumberjack: 'assets/lumberjack.png',
    depot: 'assets/depot.png'
};

// Spielstart
window.onload = () => {
    canvas = document.createElement('canvas');
    canvas.width = MAP_WIDTH * TILE_SIZE;
    canvas.height = MAP_HEIGHT * TILE_SIZE;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Bilder laden
    loadTextures(() => {
        initMap();
        drawMap();
        setupUI();
    });

    canvas.addEventListener('click', onCanvasClick);
};

// Texturen laden
function loadTextures(callback) {
    let loaded = 0;
    const total = Object.keys(textureFiles).length;

    for (let key in textureFiles) {
        images[key] = new Image();
        images[key].src = textureFiles[key] + '?v=' + Date.now();
        images[key].onload = () => {
            loaded++;
            if (loaded === total) {
                callback();
            }
        };
    }
}

// Karte initialisieren
function initMap() {
    map = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        let row = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            row.push({ type: 'grass', building: null });
        }
        map.push(row);
    }

    // HQ setzen
    const startX = Math.floor(MAP_WIDTH / 2);
    const startY = Math.floor(MAP_HEIGHT / 2);
    map[startY][startX].building = 'hq_wood';
    hqPosition = { x: startX, y: startY };
}

// Karte zeichnen
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            let tile = map[y][x];
            ctx.drawImage(images[tile.type], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            if (tile.building) {
                ctx.drawImage(images[tile.building], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

// Klick-Verarbeitung
function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);

    if (selectedTool === 'road') {
        map[y][x].building = 'road';
    } else if (selectedTool === 'hq') {
        map[y][x].building = 'hq_wood';
        hqPosition = { x, y };
    } else if (selectedTool === 'lumberjack') {
        map[y][x].building = 'lumberjack';
    } else if (selectedTool === 'depot') {
        map[y][x].building = 'depot';
    }

    drawMap();
}

// UI einrichten
function setupUI() {
    const toolbar = document.createElement('div');
    toolbar.style.position = 'fixed';
    toolbar.style.top = '10px';
    toolbar.style.left = '10px';
    toolbar.style.background = 'rgba(0,0,0,0.5)';
    toolbar.style.padding = '10px';
    toolbar.style.borderRadius = '8px';
    toolbar.style.color = '#fff';
    toolbar.style.fontFamily = 'sans-serif';

    const tools = [
        { name: 'Straße', value: 'road' },
        { name: 'HQ', value: 'hq' },
        { name: 'Holzfäller', value: 'lumberjack' },
        { name: 'Lager', value: 'depot' }
    ];

    tools.forEach(tool => {
        const btn = document.createElement('button');
        btn.textContent = tool.name;
        btn.style.margin = '5px';
        btn.onclick = () => {
            selectedTool = tool.value;
        };
        toolbar.appendChild(btn);
    });

    document.body.appendChild(toolbar);
}
