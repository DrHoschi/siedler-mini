/* ============================================================================
 * ui/ui-minimap.js
 * v25.12.16-minimap-mvp
 * Minimale Minimap (Canvas) mit Viewport-Rect + Click/Drag-to-pan
 * ----------------------------------------------------------------------------
 * Erwartet (anpassbar):
 *  - map: { wTiles, hTiles, tileSize, getTileType(tx,ty) }
 *  - camera: { x, y, viewW, viewH, setCenter(wx, wy) }
 *  - units/buildings/resources optional als Arrays mit world coords
 * ========================================================================== */

export function createMinimap(opts = {}) {
  // --------------------------------------------------------------------------
  // KONFIG / DEFAULTS
  // --------------------------------------------------------------------------
  const cfg = {
    parent: opts.parent || document.body,
    size: opts.size || 220,          // CSS-Size (px)
    renderFPS: opts.renderFPS || 8,  // dynamische Overlays
    map: opts.map,
    camera: opts.camera,
    // optional dynamische Listen (kannst du später an euren Registry/Runtime hängen)
    getUnits: opts.getUnits || (() => []),
    getBuildings: opts.getBuildings || (() => []),
    getResources: opts.getResources || (() => []),

    // Tile-Type → Minimapsymbol (FALLBACK; später an euren Tile-Index anpassen)
    // Tipp: lieber echte Farben aus eurem Tileset-Theme ableiten.
    tileColors: opts.tileColors || {
      water:   "rgba(40,120,200,0.95)",
      grass:   "rgba(40,150,80,0.95)",
      dirt:    "rgba(150,110,70,0.95)",
      sand:    "rgba(200,180,110,0.95)",
      rock:    "rgba(130,130,130,0.95)",
      snow:    "rgba(220,230,240,0.95)",
      unknown: "rgba(90,90,90,0.95)",
    },

    // Overlay-Farben (Viewport / Dots)
    colors: opts.colors || {
      viewport: "rgba(255,255,255,0.9)",
      unit:     "rgba(255,220,120,0.95)",
      building: "rgba(255,140,80,0.95)",
      resource: "rgba(160,220,255,0.95)",
      border:   "rgba(0,0,0,0.45)",
    },
  };

  if (!cfg.map || !cfg.camera) {
    throw new Error("createMinimap: opts.map und opts.camera sind Pflicht.");
  }

  // --------------------------------------------------------------------------
  // DOM
  // --------------------------------------------------------------------------
  const root = document.createElement("div");
  root.className = "hud-minimap";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });

  // Canvas intern HiDPI-scharf, außen per CSS skaliert
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssSize = cfg.size;
  canvas.style.width = cssSize + "px";
  canvas.style.height = cssSize + "px";
  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);

  root.appendChild(canvas);
  cfg.parent.appendChild(root);

  // Base-Layer wird einmalig gerendert (Terrain)
  const base = document.createElement("canvas");
  const bctx = base.getContext("2d", { alpha: true });

  // --------------------------------------------------------------------------
  // SKALIERUNG: World/Tile → Minimap-Pixel
  // --------------------------------------------------------------------------
  function getWorldSizePx() {
    const w = cfg.map.wTiles * cfg.map.tileSize;
    const h = cfg.map.hTiles * cfg.map.tileSize;
    return { w, h };
  }

  function worldToMini(wx, wy) {
    const { w, h } = getWorldSizePx();
    const sx = (wx / w) * canvas.width;
    const sy = (wy / h) * canvas.height;
    return { x: sx, y: sy };
  }

  function miniToWorld(mx, my) {
    const { w, h } = getWorldSizePx();
    const wx = (mx / canvas.width) * w;
    const wy = (my / canvas.height) * h;
    return { x: wx, y: wy };
  }

  // --------------------------------------------------------------------------
  // BASE RENDER (Terrain/Tilemap)
  // --------------------------------------------------------------------------
  function buildBase() {
    base.width = canvas.width;
    base.height = canvas.height;

    // Pro Tile ein kleines Rechteck (sehr robust, schnell genug für MVP)
    const tw = cfg.map.wTiles;
    const th = cfg.map.hTiles;

    // Pixel pro Tile in der Minimap
    const pxPerTileX = base.width / tw;
    const pxPerTileY = base.height / th;

    for (let ty = 0; ty < th; ty++) {
      for (let tx = 0; tx < tw; tx++) {
        const t = cfg.map.getTileType ? cfg.map.getTileType(tx, ty) : "unknown";
        const col = cfg.tileColors[t] || cfg.tileColors.unknown;
        bctx.fillStyle = col;
        bctx.fillRect(
          Math.floor(tx * pxPerTileX),
          Math.floor(ty * pxPerTileY),
          Math.ceil(pxPerTileX),
          Math.ceil(pxPerTileY)
        );
      }
    }

    // leichter Rahmen
    bctx.strokeStyle = cfg.colors.border;
    bctx.lineWidth = Math.max(1, 2 * dpr);
    bctx.strokeRect(0, 0, base.width, base.height);
  }

  // --------------------------------------------------------------------------
  // OVERLAY RENDER (Units/Buildings/Resources + Viewport)
  // --------------------------------------------------------------------------
  function drawDot(wx, wy, rPx, fillStyle) {
    const p = worldToMini(wx, wy);
    ctx.beginPath();
    ctx.arc(p.x, p.y, rPx, 0, Math.PI * 2);
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }

  function render() {
    // 1) Base
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);

    // 2) Ressourcen / Gebäude / Units
    const dotR = Math.max(1.2 * dpr, 2.2 * dpr);

    const resources = cfg.getResources() || [];
    for (const r of resources) drawDot(r.x, r.y, dotR, cfg.colors.resource);

    const buildings = cfg.getBuildings() || [];
    for (const b of buildings) drawDot(b.x, b.y, dotR * 1.15, cfg.colors.building);

    const units = cfg.getUnits() || [];
    for (const u of units) drawDot(u.x, u.y, dotR, cfg.colors.unit);

    // 3) Viewport-Rechteck (Kamera)
    const cam = cfg.camera;
    const topLeft = worldToMini(cam.x, cam.y);
    const bottomRight = worldToMini(cam.x + cam.viewW, cam.y + cam.viewH);

    ctx.strokeStyle = cfg.colors.viewport;
    ctx.lineWidth = Math.max(1, 2 * dpr);
    ctx.strokeRect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y
    );
  }

  // --------------------------------------------------------------------------
  // INTERAKTION: Klick/Drag → Kamera setzen
  // --------------------------------------------------------------------------
  let dragging = false;

  function getCanvasLocal(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * dpr;
    const cy = (e.clientY - rect.top) * dpr;
    return { x: cx, y: cy };
  }

  function panTo(e) {
    const p = getCanvasLocal(e);
    const w = miniToWorld(p.x, p.y);
    cfg.camera.setCenter(w.x, w.y);
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    panTo(e);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    panTo(e);
  });

  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
  });

  canvas.addEventListener("pointercancel", () => { dragging = false; });

  // --------------------------------------------------------------------------
  // LIFECYCLE
  // --------------------------------------------------------------------------
  buildBase();
  render();

  const intervalMs = Math.max(50, Math.floor(1000 / cfg.renderFPS));
  const timer = window.setInterval(render, intervalMs);

  function destroy() {
    window.clearInterval(timer);
    root.remove();
  }

  return {
    el: root,
    canvas,
    rebuildBase: () => { buildBase(); render(); },
    render,
    destroy,
  };
}
