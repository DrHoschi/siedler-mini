// === main.js V12.3 ===

// Canvas & Context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === Config ===
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 40;

// Kamera
let camX = 0;
let camY = 0;
let zoom = 1;

// Map-Daten
let map = [];
let buildings = [];
let roads = [];

// Aktuelles Tool: 'pointer', 'road', 'building'
let currentTool = 'pointer';
let ghostTile = null;

// Assets laden
const textures = {};
const assetList = [
  "grass.png", "water.png", "shore.png", "rocky.png", "sand.png", "dirt.png",
  "hq_wood.png", "lumberjack.png", "road_straight.png", "road_curve.png"
];

function loadAssets(callback) {
  let loaded = 0;
  assetList.forEach(name => {
    const img = new Image();
    img.src = `assets/${name}`;
    img.onload = () => {
      textures[name] = img;
      loaded++;
      if (loaded === assetList.length) callback();
    };
  });
}

// Map erzeugen
function generateMap() {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (Math.random() < 0.1) map[y][x] = "water.png";
      else if (Math.random() < 0.15) map[y][x] = "rocky.png";
      else if (Math.random() < 0.2) map[y][x] = "sand.png";
      else map[y][x] = "grass.png";
    }
  }
}

// Iso-Koordinaten → Bildschirm
function isoToScreen(ix, iy) {
  const sx = (ix - iy) * TILE_WIDTH / 2;
  const sy = (ix + iy) * TILE_HEIGHT / 2;
  return { x: sx, y: sy };
}

// Bildschirm → Iso-Koordinaten
function screenToIso(sx, sy) {
  const ix = (sx / (TILE_WIDTH / 2) + sy / (TILE_HEIGHT / 2)) / 2;
  const iy = (sy / (TILE_HEIGHT / 2) - sx / (TILE_WIDTH / 2)) / 2;
  return { x: Math.floor(ix), y: Math.floor(iy) };
}

// Zeichnen
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2 + camX, canvas.height / 4 + camY);
  ctx.scale(zoom, zoom);

  // Boden zeichnen
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const { x: sx, y: sy } = isoToScreen(x, y);
      ctx.drawImage(textures[map[y][x]], sx - TILE_WIDTH / 2, sy - TILE_HEIGHT / 2);
    }
  }

  // Straßen
  roads.forEach(r => {
    const { x: sx, y: sy } = isoToScreen(r.x, r.y);
    ctx.drawImage(textures[r.texture], sx - TILE_WIDTH / 2, sy - TILE_HEIGHT / 2);
  });

  // Gebäude
  buildings.forEach(b => {
    const { x: sx, y: sy } = isoToScreen(b.x, b.y);
    ctx.drawImage(textures[b.texture], sx - TILE_WIDTH / 2, sy - TILE_HEIGHT);
  });

  // Ghost-Vorschau
  if (ghostTile) {
    const { x: sx, y: sy } = isoToScreen(ghostTile.x, ghostTile.y);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(textures[ghostTile.texture], sx - TILE_WIDTH / 2, sy - TILE_HEIGHT / 2);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// Straßen-Autotiling (nur Dummy für gerade/kurve)
function getRoadTexture(x, y) {
  // Nachbarn prüfen
  const neighbors = [
    roads.find(r => r.x === x && r.y === y - 1),
    roads.find(r => r.x === x + 1 && r.y === y),
    roads.find(r => r.x === x && r.y === y + 1),
    roads.find(r => r.x === x - 1 && r.y === y)
  ];
  const connected = neighbors.filter(n => n).length;
  if (connected === 2) return "road_straight.png";
  return "road_curve.png";
}

// Events
let isPanning = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener("mousedown", e => {
  if (e.button === 0) {
    if (currentTool === 'pointer') {
      isPanning = true;
    } else if (currentTool === 'road') {
      const { x, y } = screenToIso((e.offsetX - canvas.width / 2 - camX) / zoom, (e.offsetY - canvas.height / 4 - camY) / zoom);
      roads.push({ x, y, texture: getRoadTexture(x, y) });
    }
  } else if (e.button === 1 || e.button === 2) {
    isPanning = true;
  }
  lastMouse = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("mousemove", e => {
  const world = screenToIso((e.offsetX - canvas.width / 2 - camX) / zoom, (e.offsetY - canvas.height / 4 - camY) / zoom);
  if (currentTool !== 'pointer') {
    ghostTile = { x: world.x, y: world.y, texture: currentTool === 'road' ? "road_straight.png" : "hq_wood.png" };
  }
  if (isPanning) {
    camX += (e.clientX - lastMouse.x);
    camY += (e.clientY - lastMouse.y);
    lastMouse = { x: e.clientX, y: e.clientY };
  }
});

canvas.addEventListener("mouseup", () => {
  isPanning = false;
});

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomFactor = 1.1;
  if (e.deltaY < 0) {
    zoom *= zoomFactor;
  } else {
    zoom /= zoomFactor;
  }
}, { passive: false });

// ESC → Zeiger
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    currentTool = 'pointer';
    ghostTile = null;
  }
});

// Start
loadAssets(() => {
  generateMap();
  requestAnimationFrame(function loop() {
    draw();
    requestAnimationFrame(loop);
  });
});
