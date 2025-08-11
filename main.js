/* ==== Siedler‑Mini V11.1 – main.js (hex-like grid, Boden-Texturen, Bauen/Abriss) ==== */

(() => {
  // ---------- Canvas & Resize ----------
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let W = 0, H = 0;

  function resizeCanvas() {
    const headerH = document.querySelector('header').offsetHeight || 0;
    const tbH = document.getElementById('toolbar').offsetHeight || 0;
    W = Math.floor(window.innerWidth);
    H = Math.max(120, Math.floor(window.innerHeight - headerH - tbH));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // ---------- Ansicht / Kamera ----------
  let viewMode = 'iso'; // 'iso' | 'top' | 'persp'
  const viewLbl = document.getElementById('viewLbl');
  document.getElementById('toggleView').onclick = () => {
    viewMode = viewMode === 'iso' ? 'top' : viewMode === 'top' ? 'persp' : 'iso';
    viewLbl.textContent = viewMode === 'iso' ? 'Iso' : (viewMode === 'top' ? 'Top' : 'Persp');
    drawAll();
  };

  const cam = { x: 0, y: 0, z: 1 };
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const beforeX = sx / cam.z + cam.x, beforeY = sy / cam.z + cam.y;
    cam.z = Math.max(0.5, Math.min(2.5, cam.z * (e.deltaY > 0 ? 0.9 : 1.1)));
    cam.x = beforeX - sx / cam.z;
    cam.y = beforeY - sy / cam.z;
  }, { passive: false });

  // ---------- Ressourcen / HUD ----------
  const res = { wood: 20, stone: 10, food: 10, gold: 0, pop: 5 };
  function hud() {
    (wood || {}).textContent = Math.floor(res.wood);
    (stone || {}).textContent = Math.floor(res.stone);
    (food || {}).textContent = Math.floor(res.food);
    (gold || {}).textContent = Math.floor(res.gold);
    (pop || {}).textContent = Math.floor(res.pop);
  }
  hud();

  // ---------- Texturen laden ----------
  const IMAGES = {};
  function loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { IMAGES[key] = img; resolve(); };
      img.onerror = () => { console.warn('Image failed:', src); resolve(); };
      img.src = src;
    });
  }

  // Mindest-Assets – diese Pfade müssen im Repo existieren:
  const toLoad = [
    ['grass', 'assets/grass.png'],
    ['water', 'assets/water.png'],
    ['shore', 'assets/shore.png'],
    ['hq',    'assets/hq_wood.png'],
    // optional: ['road_straight','assets/road_straight.png']
  ];

  // ---------- Karte / Tiles ----------
  const MAP = { W: 36, H: 28, TILE: 64 };
  const grid = Array.from({ length: MAP.H }, () =>
    Array.from({ length: MAP.W }, () => ({
      ground: 'grass', road: false, building: null
    }))
  );

  // einfache Wasserzone + Küstenrand
  function generateGround() {
    // See in der linken Hälfte
    for (let y = 14; y < 22; y++) for (let x = 4; x < 14; x++) grid[y][x].ground = 'water';
    // automatisch Ufer setzen
    for (let y = 1; y < MAP.H - 1; y++) {
      for (let x = 1; x < MAP.W - 1; x++) {
        if (grid[y][x].ground === 'water') continue;
        const adjWater =
          grid[y - 1][x].ground === 'water' ||
          grid[y + 1][x].ground === 'water' ||
          grid[y][x - 1].ground === 'water' ||
          grid[y][x + 1].ground === 'water';
        if (adjWater) grid[y][x].ground = 'shore';
      }
    }
  }

  // ---------- Start / Overlay ----------
  let started = false;
  document.querySelectorAll('#overlay .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.action;
      if (act === 'start') { startGame(); }
      if (act === 'reset') { resetGame(); }
    });
  });

  function startGame() {
    if (started) return;
    started = true;
    document.getElementById('overlay').style.display = 'none';
    // HQ in Mitte
    const cx = (MAP.W / 2) | 0, cy = (MAP.H / 2) | 0;
    grid[cy][cx].building = 'hq';
    // Kamera grob zentrieren
    cam.x = cx * MAP.TILE - W / (2 * cam.z) + MAP.TILE / 2;
    cam.y = cy * MAP.TILE - H / (2 * cam.z) + MAP.TILE / 2;
  }

  function resetGame() {
    // alles zurücksetzen
    for (let y = 0; y < MAP.H; y++)
      for (let x = 0; x < MAP.W; x++)
        grid[y][x] = { ground: 'grass', road: false, building: null };
    generateGround();
    started = false;
    document.getElementById('overlay').style.display = 'flex';
    cam.x = cam.y = 0; cam.z = 1;
    res.wood = 20; res.stone = 10; res.food = 10; res.gold = 0; res.pop = 5;
    hud();
    drawAll();
  }

  // ---------- Toolbar / Bauen ----------
  let tool = 'road';
  [...document.querySelectorAll('#toolbar .btn')].forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#toolbar .btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      tool = b.dataset.tool;
    });
  });

  const costs = {
    road:   { wood: 1 },
    lumber: { wood: 5 },
    quarry: { wood: 5, food: 2 },
    farm:   { wood: 5 },
    house:  { wood: 10, stone: 5, food: 5 },
    depot:  { wood: 8, stone: 2 }
  };
  function canPay(c) { for (const k in c) if ((res[k] || 0) < c[k]) return false; return true; }
  function pay(c){ for (const k in c) res[k]-=c[k]; hud(); }

  function inb(x,y){ return x>=0 && y>=0 && x<MAP.W && y<MAP.H; }

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const gx = Math.floor((sx / cam.z + cam.x) / MAP.TILE);
    const gy = Math.floor((sy / cam.z + cam.y) / MAP.TILE);
    if (!inb(gx, gy)) return;

    if (tool === 'bulldoze') {
      // HQ bleibt geschützt
      if (grid[gy][gx].building === 'hq') return;
      grid[gy][gx].road = false;
      grid[gy][gx].building = null;
      drawAll();
      return;
    }

    if (tool === 'road') {
      if (!grid[gy][gx].road && grid[gy][gx].ground !== 'water') {
        if (!canPay(costs.road)) return;
        pay(costs.road);
        grid[gy][gx].road = true;
      }
      drawAll();
      return;
    }

    // Gebäude
    if (!grid[gy][gx].building && !grid[gy][gx].road && grid[gy][gx].ground !== 'water') {
      if (!canPay(costs[tool] || {})) return;
      pay(costs[tool] || {});
      grid[gy][gx].building = tool;
      drawAll();
    }
  });

  // ---------- Zeichnen ----------
  function drawGround() {
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const g = grid[y][x].ground;
        const img = g === 'water' ? IMAGES.water : (g === 'shore' ? IMAGES.shore : IMAGES.grass);
        const dx = x * MAP.TILE - cam.x, dy = y * MAP.TILE - cam.y;
        if (img && img.width) {
          ctx.drawImage(img, dx, dy, MAP.TILE, MAP.TILE);
        } else {
          ctx.fillStyle = g === 'water' ? '#0e2233' : (g === 'shore' ? '#2a3f2a' : '#1b2e19');
          ctx.fillRect(dx, dy, MAP.TILE, MAP.TILE);
        }
        // dezentes Raster
        ctx.strokeStyle = 'rgba(255,255,255,.05)';
        ctx.strokeRect(dx, dy, MAP.TILE, MAP.TILE);
      }
    }
  }

  function drawRoads() {
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        if (!grid[y][x].road) continue;
        const dx = x * MAP.TILE - cam.x, dy = y * MAP.TILE - cam.y;
        ctx.fillStyle = '#6b6f7a';
        ctx.fillRect(dx + 10, dy + 22, MAP.TILE - 20, 20); // simpler Feldweg
      }
    }
  }

  function drawBuildings() {
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const b = grid[y][x].building;
        if (!b) continue;
        const dx = x * MAP.TILE - cam.x, dy = y * MAP.TILE - cam.y;

        if (b === 'hq') {
          const img = IMAGES.hq;
          if (img && img.width) {
            const w = MAP.TILE * 1.2;
            const h = img.height * (w / img.width);
            ctx.drawImage(img, dx + MAP.TILE/2 - w/2, dy + MAP.TILE - h + 8, w, h);
          } else {
            ctx.fillStyle = '#6a4';
            ctx.fillRect(dx + 6, dy + 6, MAP.TILE - 12, MAP.TILE - 12);
          }
          continue;
        }

        // Platzhalter für andere Gebäude (bis die PNGs eingebunden sind)
        ctx.fillStyle =
          b === 'depot' ? '#8a6a46' :
          b === 'lumber' ? '#3f6a3f' :
          b === 'quarry' ? '#5b6370' :
          b === 'farm' ? '#8aa34f' :
          b === 'house' ? '#6f7c8a' : '#445';
        ctx.fillRect(dx + 8, dy + 8, MAP.TILE - 16, MAP.TILE - 16);
      }
    }
  }

  function drawAll() {
    ctx.save();
    ctx.scale(cam.z, cam.z);
    drawGround();
    drawRoads();
    drawBuildings();
    ctx.restore();
  }

  // ---------- Boot ----------
  function boot() {
    generateGround();
    drawAll();
  }

  Promise.all(toLoad.map(([k, s]) => loadImage(k, s)))
    .then(() => {
      boot();
      // Overlay bleibt sichtbar bis Start gedrückt wurde
    });

})();