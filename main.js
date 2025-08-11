/* ==== Siedler‑Mini V11.1 – main.js (Top/Persp/Iso, Texturen, Pan/Zoom, Bauen/Abriss) ==== */
(() => {
  // ---------- Canvas ----------
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let W = 0, H = 0;

  function resizeCanvas() {
    const headerH = (document.querySelector('header')?.offsetHeight) || 0;
    const tbH = (document.getElementById('toolbar')?.offsetHeight) || 0;
    W = Math.floor(window.innerWidth);
    H = Math.max(120, Math.floor(window.innerHeight - headerH - tbH));
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawAll();
  }
  addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // ---------- Ansicht / Kamera ----------
  let viewMode = 'iso'; // 'iso' | 'top' | 'persp'
  const cam = { x: 0, y: 0, z: 1 };

  const viewLbl = document.getElementById('viewLbl');
  document.getElementById('toggleView').onclick = () => {
    viewMode = viewMode === 'iso' ? 'top' : (viewMode === 'top' ? 'persp' : 'iso');
    viewLbl.textContent = viewMode === 'iso' ? 'Iso' : (viewMode === 'top' ? 'Top' : 'Persp');
    // HQ (oder Mitte) als Anker zentrieren
    let cx = (MAP.W/2)|0, cy = (MAP.H/2)|0;
    for (let y=0;y<MAP.H;y++) for (let x=0;x<MAP.W;x++) if (grid[y][x].building==='hq'){ cx=x; cy=y; }
    centerCamToCell(cx, cy);
    drawAll();
  };

  // Zoom zum Mauszeiger
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const beforeX = sx / cam.z + cam.x, beforeY = sy / cam.z + cam.y;
    cam.z = Math.max(0.5, Math.min(2.5, cam.z * (e.deltaY > 0 ? 0.9 : 1.1)));
    cam.x = beforeX - sx / cam.z;
    cam.y = beforeY - sy / cam.z;
    drawAll();
  }, { passive: false });

  // Pan (rechte Maustaste ziehen) + Touch (zwei Finger)
  let panning = false, panLast = {x:0,y:0};
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 2) { // right mouse
      panning = true; panLast = {x:e.clientX, y:e.clientY};
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!panning) return;
    const dx = (e.clientX - panLast.x) / cam.z;
    const dy = (e.clientY - panLast.y) / cam.z;
    cam.x -= dx; cam.y -= dy; panLast = {x:e.clientX, y:e.clientY};
    drawAll();
  });
  canvas.addEventListener('pointerup', () => { panning = false; });
  canvas.addEventListener('contextmenu', (e)=>e.preventDefault()); // Rechtsklick-Menu aus

  // Touch: zwei Finger = Pan + Pinch handled vom Browser-zoom nicht, daher manuell:
  let tStart = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length===2){
      const p0=e.touches[0], p1=e.touches[1];
      tStart = {
        cx:(p0.clientX+p1.clientX)/2, cy:(p0.clientY+p1.clientY)/2,
        d: Math.hypot(p0.clientX-p1.clientX, p0.clientY-p1.clientY),
        cam: {...cam}
      };
    }
  }, {passive:true});
  canvas.addEventListener('touchmove', (e) => {
    if (!tStart || e.touches.length!==2) return;
    e.preventDefault();
    const p0=e.touches[0], p1=e.touches[1];
    const cx=(p0.clientX+p1.clientX)/2, cy=(p0.clientY+p1.clientY)/2;
    const d = Math.hypot(p0.clientX-p1.clientX, p0.clientY-p1.clientY);
    const scale = d / tStart.d;
    cam.z = Math.max(0.5, Math.min(2.5, tStart.cam.z * scale));
    // Pan nach Midpoint
    cam.x = tStart.cam.x - (cx - tStart.cx) / cam.z;
    cam.y = tStart.cam.y - (cy - tStart.cy) / cam.z;
    drawAll();
  }, {passive:false});
  canvas.addEventListener('touchend', ()=>{ tStart=null; }, {passive:true});

  // ---------- Ressourcen / HUD ----------
  const res = { wood: 20, stone: 10, food: 10, gold: 0, pop: 5 };
  function hud() {
    const ids = ['wood','stone','food','gold','pop'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = Math.floor(res[id]); });
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
  const toLoad = [
    ['grass', 'assets/grass.png'],
    ['water', 'assets/water.png'],
    ['shore', 'assets/shore.png'],
    ['hq',    'assets/hq_wood.png']
  ];

  // ---------- Karte ----------
  const MAP = { W: 36, H: 28, TILE: 64 };
  const grid = Array.from({ length: MAP.H }, () =>
    Array.from({ length: MAP.W }, () => ({ ground: 'grass', road: false, building: null }))
  );

  function generateGround() {
    // kleiner See links
    for (let y = 14; y < 22; y++) for (let x = 4; x < 14; x++) grid[y][x].ground = 'water';
    // Ufer automatisch
    for (let y = 1; y < MAP.H - 1; y++) {
      for (let x = 1; x < MAP.W - 1; x++) {
        if (grid[y][x].ground === 'water') continue;
        const n =
          grid[y-1][x].ground === 'water' ||
          grid[y+1][x].ground === 'water' ||
          grid[y][x-1].ground === 'water' ||
          grid[y][x+1].ground === 'water';
        if (n) grid[y][x].ground = 'shore';
      }
    }
  }

  // ---------- Projektion / Kamera-Zentrierung ----------
  function projRect(x, y) {
    // Weltkachel -> Bildschirmrechteck (ungezoomt)
    if (viewMode === 'top') {
      return { x: x*MAP.TILE - cam.x, y: y*MAP.TILE - cam.y, w: MAP.TILE, h: MAP.TILE };
    }
    if (viewMode === 'persp') {
      const h = MAP.TILE * 0.82; // vertikal flacher
      return { x: x*MAP.TILE - cam.x, y: y*h - cam.y, w: MAP.TILE, h };
    }
    // iso
    const isoX = (x - y) * (MAP.TILE * 0.75);
    const isoY = (x + y) * (MAP.TILE * 0.38);
    return { x: isoX - cam.x, y: isoY - cam.y, w: MAP.TILE * 0.92, h: MAP.TILE * 0.92 };
  }

  function centerCamToCell(cx, cy) {
    const r = projRect(cx, cy);
    cam.x = r.x + r.w/2 - (W / cam.z)/2;
    cam.y = r.y + r.h/2 - (H / cam.z)/2;
  }

  // Heuristik: finde Zelle unter Bildschirmpunkt (sx,sy)
  function screenToCell(sx, sy) {
    const wx = sx / cam.z + cam.x;
    const wy = sy / cam.z + cam.y;
    // Brute-force (Map ist klein): prüfe projRect‑Bounds
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const r = projRect(x, y);
        if (wx >= r.x && wy >= r.y && wx < r.x + r.w && wy < r.y + r.h) {
          return { x, y };
        }
      }
    }
    return null;
  }

  // ---------- Start / Reset ----------
  let started = false;
  document.querySelectorAll('#overlay .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.action;
      if (act === 'start') startGame();
      if (act === 'reset') resetGame();
    });
  });

  function startGame() {
    if (started) return;
    started = true;
    document.getElementById('overlay').style.display = 'none';
    const cx = (MAP.W/2)|0, cy = (MAP.H/2)|0;
    grid[cy][cx].building = 'hq';
    centerCamToCell(cx, cy);
    drawAll();
  }

  function resetGame() {
    for (let y = 0; y < MAP.H; y++)
      for (let x = 0; x < MAP.W; x++)
        grid[y][x] = { ground: 'grass', road: false, building: null };
    generateGround();
    started = false;
    document.getElementById('overlay').style.display = 'flex';
    cam.x = cam.y = 0; cam.z = 1;
    centerCamToCell((MAP.W/2)|0, (MAP.H/2)|0);
    res.wood = 20; res.stone = 10; res.food = 10; res.gold = 0; res.pop = 5;
    hud(); drawAll();
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
    // Linksklick bauen
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const cell = screenToCell(sx, sy);
    if (!cell) return;
    const gx = cell.x, gy = cell.y;
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
        const r = projRect(x, y);
        if (img && img.width) {
          ctx.drawImage(img, r.x, r.y, r.w, r.h);
        } else {
          ctx.fillStyle = g === 'water' ? '#0e2233' : (g === 'shore' ? '#2a3f2a' : '#1b2e19');
          ctx.fillRect(r.x, r.y, r.w, r.h);
        }
        // dezentes Raster
        ctx.strokeStyle = 'rgba(255,255,255,.05)';
        ctx.strokeRect(r.x, r.y, r.w, r.h);
      }
    }
  }

  function drawRoads() {
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        if (!grid[y][x].road) continue;
        const r = projRect(x, y);
        ctx.fillStyle = '#6b6f7a';
        ctx.fillRect(r.x + r.w*0.16, r.y + r.h*0.34, r.w*0.68, r.h*0.32); // einfacher Feldweg
      }
    }
  }

  function drawBuildings() {
    for (let y = 0; y < MAP.H; y++) {
      for (let x = 0; x < MAP.W; x++) {
        const b = grid[y][x].building;
        if (!b) continue;
        const r = projRect(x, y);

        if (b === 'hq') {
          const img = IMAGES.hq;
          if (img && img.width) {
            const w = r.w * 1.15;
            const h = img.height * (w / img.width);
            ctx.drawImage(img, r.x + r.w/2 - w/2, r.y + r.h - h + r.h*0.12, w, h);
          } else {
            ctx.fillStyle = '#6a4';
            ctx.fillRect(r.x + r.w*0.1, r.y + r.h*0.1, r.w*0.8, r.h*0.8);
          }
          continue;
        }

        // Platzhalter-Farben für andere Gebäude (bis PNGs genutzt werden)
        ctx.fillStyle =
          b === 'depot'  ? '#8a6a46' :
          b === 'lumber' ? '#3f6a3f' :
          b === 'quarry' ? '#5b6370' :
          b === 'farm'   ? '#8aa34f' :
          b === 'house'  ? '#6f7c8a' : '#445';
        ctx.fillRect(r.x + r.w*0.12, r.y + r.h*0.12, r.w*0.76, r.h*0.76);
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
    // Kamera auf Kartenmitte, noch bevor Start
    centerCamToCell((MAP.W/2)|0, (MAP.H/2)|0);
    drawAll();
  }

  Promise.all(toLoad.map(([k, s]) => loadImage(k, s)))
    .then(() => { boot(); /* Overlay bleibt bis Start sichtbar */ });

})();