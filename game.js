// game.js — V14.6-mobil-build
// Render-Loop, Pan/Zoom, Bauen (Straße/HQ/Holzfäller/Depot), Ghost-Preview, Ressourcen.

export async function startGame(opts) {
  const { canvas, DPR = 1, onHUD = () => {}, onZoom = () => {} } = opts;

  // --- State ----------------------------------------------------------------
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const world = {
    tile: 48,            // Grundgröße pro Kachel (vor Zoom)
    scale: 1,
    minScale: 0.5,
    maxScale: 2.5,
    panX: 0,
    panY: 0,
    gridSize: 200,       // virtueller Bereich (Kacheln)
    roads: new Set(),    // "x,y" als Key (Straßenkachel)
    buildings: [],       // {type, x, y, w, h}
    hqPlaced: false,
  };

  const res = {
    holz: 30,
    stein: 20,
    nahrung: 0,
    gold: 0,
    traeger: 0,
  };

  const cost = {
    road: { holz: 1 },
    hq: { stein: 5 },
    woodcutter: { holz: 2, stein: 1 },
    depot: { holz: 3, stein: 2 },
  };

  let currentTool = "pointer"; // pointer | road | hq | woodcutter | depot | erase
  onHUD("tool", toolLabel(currentTool));
  pushResHUD();

  // --- Koordinaten / View ---------------------------------------------------
  function centerOn(xTiles, yTiles) {
    const { width, height } = canvas;
    const viewW = width / DPR;
    const viewH = height / DPR;
    const px = xTiles * world.tile * world.scale;
    const py = yTiles * world.tile * world.scale;
    world.panX = viewW * 0.5 - px;
    world.panY = viewH * 0.5 - py;
  }

  // beim Start: HQ mittig stehen (als Preview); echtes Setzen beim ersten HQ-Bau
  centerOn(world.gridSize / 2, world.gridSize / 2);

  // --- Events von Buttons/Tools --------------------------------------------
  const toolsRoot = document.querySelector("#tools");
  if (toolsRoot) {
    toolsRoot.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-tool]");
      if (!btn) return;
      currentTool = btn.getAttribute("data-tool") || "pointer";
      onHUD("tool", toolLabel(currentTool));
    });
  }
  addEventListener("ui-center", () => {
    // Zentriert auf HQ, sonst auf Mitte
    const hq = world.buildings.find((b) => b.type === "hq");
    if (hq) centerOn(hq.x + hq.w * 0.5, hq.y + hq.h * 0.5);
    else centerOn(world.gridSize / 2, world.gridSize / 2);
  });
  addEventListener("ui-debug", () => {
    console.log("DEBUG", { res, world, currentTool, scale: world.scale });
  });

  // --- Eingabe (Pan/Zoom + Tap) --------------------------------------------
  let dragging = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    lastX = e.clientX; lastY = e.clientY;
    dragging = true;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (currentTool !== "pointer") return; // Karte verschieben nur im Zeiger-Tool
    const dx = (e.clientX - lastX);
    const dy = (e.clientY - lastY);
    world.panX += dx;
    world.panY += dy;
    lastX = e.clientX; lastY = e.clientY;
  });

  addEventListener("pointerup", () => { dragging = false; });

  // Scroll-/Pinch-Zoom (Mausrad mobil ≈ Scroll-Geste in iPadOS Safari)
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * -0.1;
    zoomAt(canvas, e.clientX, e.clientY, delta);
  }, { passive: false });

  // Simple Tap (Kurzer Klick)
  canvas.addEventListener("click", (e) => {
    const pt = clientToWorld(e.clientX, e.clientY);
    const gx = Math.floor(pt.x);
    const gy = Math.floor(pt.y);
    handleBuildAt(gx, gy);
  });

  function zoomAt(target, clientX, clientY, delta) {
    const rect = target.getBoundingClientRect();
    const mx = (clientX - rect.left);
    const my = (clientY - rect.top);
    const before = screenToWorld(mx, my);

    world.scale = clamp(world.scale * (1 + delta), world.minScale, world.maxScale);
    onZoom(world.scale);

    const after = screenToWorld(mx, my);
    world.panX += (before.x - after.x) * world.tile * world.scale;
    world.panY += (before.y - after.y) * world.tile * world.scale;
  }

  // --- Bauen / Löschen ------------------------------------------------------
  function handleBuildAt(gx, gy) {
    if (currentTool === "pointer") return;

    if (currentTool === "erase") {
      // Straße löschen?
      const k = key(gx, gy);
      if (world.roads.has(k)) {
        world.roads.delete(k);
        // (kleine Rückerstattung? hier bewusst keine)
        return;
      }
      // Gebäude löschen?
      const idx = world.buildings.findIndex((b) => gx >= b.x && gx < b.x + b.w && gy >= b.y && gy < b.y + b.h);
      if (idx >= 0) {
        world.buildings.splice(idx, 1);
        if (!world.buildings.some(b => b.type === "hq")) world.hqPlaced = false;
      }
      return;
    }

    if (currentTool === "road") {
      if (!canAfford(cost.road)) return;
      const k = key(gx, gy);
      if (world.roads.has(k)) return; // schon Straße
      world.roads.add(k);
      pay(cost.road);
      pushResHUD();
      return;
    }

    if (currentTool === "hq") {
      if (world.hqPlaced) return;
      if (!canAfford(cost.hq)) return;
      world.buildings.push({ type: "hq", x: gx - 2, y: gy - 1, w: 4, h: 2 });
      world.hqPlaced = true;
      pay(cost.hq);
      pushResHUD();
      return;
    }

    if (currentTool === "woodcutter") {
      if (!canAfford(cost.woodcutter)) return;
      world.buildings.push({ type: "woodcutter", x: gx - 1, y: gy - 1, w: 2, h: 2 });
      pay(cost.woodcutter);
      pushResHUD();
      return;
    }

    if (currentTool === "depot") {
      if (!canAfford(cost.depot)) return;
      world.buildings.push({ type: "depot", x: gx - 1, y: gy - 1, w: 2, h: 2 });
      pay(cost.depot);
      pushResHUD();
      return;
    }
  }

  function canAfford(c) {
    for (const k in c) if (res[k] < c[k]) return false;
    return true;
  }
  function pay(c) {
    for (const k in c) res[k] -= c[k];
  }
  function pushResHUD() {
    onHUD("holz", res.holz);
    onHUD("stein", res.stein);
    onHUD("nahrung", res.nahrung);
    onHUD("gold", res.gold);
    onHUD("traeger", res.traeger);
    onHUD("zoom", `${world.scale.toFixed(2)}x`);
  }

  // --- Render ---------------------------------------------------------------
  function render() {
    const W = canvas.width, H = canvas.height;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Hintergrund
    ctx.fillStyle = "#0f1823";
    ctx.fillRect(0, 0, W, H);

    // Welt-Transform
    ctx.save();
    ctx.translate(world.panX, world.panY);
    ctx.scale(world.scale, world.scale);

    // Raster
    drawGrid();

    // Straßen
    drawRoads();

    // Gebäude
    drawBuildings();

    // Ghost-Preview (wenn Build-Tool)
    drawGhost();

    ctx.restore();

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  // --- Helpers --------------------------------------------------------------
  function drawGrid() {
    const t = world.tile;
    const cols = Math.ceil(canvas.width / DPR / (t * world.scale)) + 2;
    const rows = Math.ceil(canvas.height / DPR / (t * world.scale)) + 2;

    // Offset in Weltkoordinaten
    const topLeft = screenToWorld(0, 0);
    const startX = Math.floor(topLeft.x) - 1;
    const startY = Math.floor(topLeft.y) - 1;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) {
      const gx = (startX + x) * t;
      ctx.moveTo(gx, (startY) * t);
      ctx.lineTo(gx, (startY + rows) * t);
    }
    for (let y = 0; y <= rows; y++) {
      const gy = (startY + y) * t;
      ctx.moveTo((startX) * t, gy);
      ctx.lineTo((startX + cols) * t, gy);
    }
    ctx.stroke();
  }

  function drawRoads() {
    const t = world.tile;
    ctx.fillStyle = "#6c8";
    world.roads.forEach(k => {
      const { x, y } = unkey(k);
      ctx.fillRect(x * t + 4, y * t + 20, t - 8, 8); // simple Balkenstraße
    });
  }

  function drawBuildings() {
    const t = world.tile;
    for (const b of world.buildings) {
      if (b.type === "hq") {
        ctx.fillStyle = "#36a852";
      } else if (b.type === "woodcutter") {
        ctx.fillStyle = "#2a7aee";
      } else if (b.type === "depot") {
        ctx.fillStyle = "#c27";
      } else {
        ctx.fillStyle = "#888";
      }
      ctx.fillRect(b.x * t, b.y * t, b.w * t, b.h * t);

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 22px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.fillText(labelFor(b.type), b.x * t + 8, b.y * t + 24);
    }
  }

  function drawGhost() {
    if (currentTool === "pointer" || currentTool === "erase") return;

    const pt = lastPointerWorld();
    if (!pt) return;

    const t = world.tile;
    ctx.save();
    ctx.globalAlpha = 0.35;

    if (currentTool === "road") {
      ctx.fillStyle = canAfford(cost.road) ? "#6c8" : "#c55";
      const gx = Math.floor(pt.x), gy = Math.floor(pt.y);
      ctx.fillRect(gx * t + 4, gy * t + 20, t - 8, 8);
    } else {
      let w = 2, h = 2, color = "#888";
      if (currentTool === "hq") { w = 4; h = 2; color = "#36a852"; }
      if (currentTool === "woodcutter") { w = 2; h = 2; color = "#2a7aee"; }
      if (currentTool === "depot") { w = 2; h = 2; color = "#c27"; }
      const gx = Math.floor(pt.x) - Math.floor(w/2);
      const gy = Math.floor(pt.y) - Math.floor(h/2);
      const affordable = canAfford(cost[currentTool] || {});
      ctx.fillStyle = affordable ? color : "#c55";
      ctx.fillRect(gx * t, gy * t, w * t, h * t);
    }
    ctx.restore();
  }

  // Pointer-Tracking für Ghost
  let lastClientX = null, lastClientY = null;
  canvas.addEventListener("pointermove", (e) => { lastClientX = e.clientX; lastClientY = e.clientY; });
  function lastPointerWorld() {
    if (lastClientX == null) return null;
    return clientToWorld(lastClientX, lastClientY);
  }

  // Mathe/Koord‑Utils
  function clientToWorld(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const sx = (cx - r.left);
    const sy = (cy - r.top);
    return screenToWorld(sx, sy);
  }
  function screenToWorld(sx, sy) {
    const x = (sx - world.panX) / (world.tile * world.scale);
    const y = (sy - world.panY) / (world.tile * world.scale);
    return { x, y };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function key(x, y) { return `${x},${y}`; }
  function unkey(k) { const [x, y] = k.split(",").map(n => parseInt(n, 10)); return { x, y }; }
  function toolLabel(t) {
    switch (t) {
      case "pointer": return "Zeiger";
      case "road": return "Straße";
      case "hq": return "HQ";
      case "woodcutter": return "Holzfäller";
      case "depot": return "Depot";
      case "erase": return "Abriss";
      default: return t;
    }
  }
  function labelFor(t) {
    switch (t) {
      case "hq": return "HQ";
      case "woodcutter": return "Holzfäller";
      case "depot": return "Depot";
      default: return t;
    }
  }

  // beim Start direkt Zoom in HUD schreiben
  onZoom(world.scale);

  // API zurück (optional nutzbar)
  return {
    requestFullscreen: false,
  };
}
