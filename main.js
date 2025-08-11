/* === Siedler-Mini V11.1 - Spiellogik === */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let viewMode = 'iso'; // iso | top | persp
const viewLbl = document.getElementById('viewLbl');
document.getElementById('toggleView').onclick = () => {
  const modes = ['iso', 'top', 'persp'];
  viewMode = modes[(modes.indexOf(viewMode) + 1) % modes.length];
  viewLbl.textContent = viewMode;
};

let resources = { wood: 20, stone: 10, food: 10, gold: 0, pop: 5 };
function updateStats() {
  for (let k in resources) {
    const el = document.getElementById(k);
    if (el) el.textContent = resources[k];
  }
}
updateStats();

let mapSize = 30;
let tileSize = 48;
let grid = [];
let carriers = [];
let depots = [];
let selectedTool = 'road';

for (let y = 0; y < mapSize; y++) {
  grid[y] = [];
  for (let x = 0; x < mapSize; x++) {
    grid[y][x] = { type: 'empty', road: false, building: null };
  }
}

document.querySelectorAll('#toolbar .btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#toolbar .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedTool = btn.dataset.tool;
  };
});

document.querySelectorAll('#overlay .btn').forEach(btn => {
  btn.onclick = () => {
    if (btn.dataset.action === 'start' || btn.dataset.action === 'reset') {
      startGame();
      document.getElementById('overlay').style.display = 'none';
    }
  };
});

function startGame() {
  // HQ setzen
  const hqX = Math.floor(mapSize / 2);
  const hqY = Math.floor(mapSize / 2);
  grid[hqY][hqX].building = 'hq';
  spawnCarrier(hqX, hqY, true);
}

function spawnCarrier(x, y, isHQ = false) {
  carriers.push({
    x, y,
    target: null,
    load: [],
    fromHQ: isHQ
  });
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const gx = Math.floor((e.clientX - rect.left) / tileSize);
  const gy = Math.floor((e.clientY - rect.top) / tileSize);

  if (gx < 0 || gy < 0 || gx >= mapSize || gy >= mapSize) return;

  if (selectedTool === 'bulldoze') {
    grid[gy][gx] = { type: 'empty', road: false, building: null };
  } else if (selectedTool === 'road') {
    if (!grid[gy][gx].road) {
      grid[gy][gx].road = true;
      resources.wood--;
    }
  } else {
    if (!grid[gy][gx].building && !grid[gy][gx].road) {
      grid[gy][gx].building = selectedTool;
      if (selectedTool === 'depot') depots.push({ x: gx, y: gy });
    }
  }
  updateStats();
});

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawCarriers();
  requestAnimationFrame(gameLoop);
}

function drawMap() {
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      const tile = grid[y][x];
      ctx.strokeStyle = '#333';
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      if (tile.road) {
        ctx.fillStyle = '#666';
        ctx.fillRect(x * tileSize + 10, y * tileSize + 10, tileSize - 20, tileSize - 20);
      }
      if (tile.building) {
        ctx.fillStyle = tile.building === 'hq' ? '#6a4' :
                        tile.building === 'depot' ? '#a64' : '#468';
        ctx.fillRect(x * tileSize + 4, y * tileSize + 4, tileSize - 8, tileSize - 8);
      }
    }
  }
}

function drawCarriers() {
  ctx.fillStyle = 'yellow';
  carriers.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x * tileSize + tileSize / 2, c.y * tileSize + tileSize / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

gameLoop();
