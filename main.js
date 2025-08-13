// main.js — Siedler‑Mini V13.8.2 (Mobile)
// ------------------------------------------------------------
// Erwartete DOM‑Elemente: in index.html vorhanden (canvas, Tool‑Buttons, Overlay…)
// Exportiert: startFromOverlay(e), toggleFullscreen()

// ===== Imports =====
import { IM, loadAllAssets }         from './core/assets.js';
import { Camera }                    from './core/camera.js';
import { setupInput }                from './core/input.js';
import { ensureWorld, tileAt, setTile, autotileRoad, TILES } from './world.js';
import { createRenderer }            from './render.js';

// (optional) Carriers‑System vorbereiten – kann leer sein, wird später erweitert
let Carriers = { init:()=>({update:()=>{}}) };
try {
  const m = await import('./core/carriers.js');
  // carriers.js darf leer sein; wenn vorhanden, nutzen
  if (m && m.Carriers) Carriers = m.Carriers;
} catch(_) { /* ok, später */ }

// ===== Globale App‑Objekte =====
const dom = {
  canvas: document.getElementById('gameCanvas'),
  overlay: document.getElementById('startOverlay'),
  fsTopBtn: document.getElementById('fsBtn'),
  fsPreBtn: document.getElementById('fsPreBtn'),
  startBtn: document.getElementById('startBtn'),
  toolInfo: document.getElementById('toolInfo'),
  zoomInfo: document.getElementById('zoomInfo'),
  centerBtn: document.getElementById('centerBtn'),
  dbgBtn: document.getElementById('dbgBtn'),
  toolsPanel: document.getElementById('tools'),
  res: {
    wood: document.getElementById('resWood'),
    stone: document.getElementById('resStone'),
    food:  document.getElementById('resFood'),
    gold:  document.getElementById('resGold'),
    carriers: document.getElementById('resCarriers'),
  }
};

const state = {
  started: false,
  debug: false,
  tool: 'pointer', // 'pointer' | 'road' | 'hq' | 'lumber' | 'depot' | 'erase'
  zoom: 1,
  world: null,
  cam: null,
  rnd: null,
  carriers: null,
  // Ressourcen
  res: { wood:20, stone:10, food:10, gold:0, carriers:0 },
  // Tiles
  iso: { tw: 128, th: 64 }, // Texturen sind isometrisch (Breite/Höhe pro Tile)
};

// ===== Utility =====
const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
function updateTopUI(){
  dom.toolInfo.textContent = `Tool: ${toolLabel(state.tool)}`;
  dom.zoomInfo.textContent = `Zoom ${state.zoom.toFixed(2)}×`;
  dom.res.wood.textContent = `🌲 Holz ${state.res.wood}`;
  dom.res.stone.textContent = `🪨 Stein ${state.res.stone}`;
  dom.res.food.textContent  = `🌿 Nahrung ${state.res.food}`;
  dom.res.gold.textContent  = `🪙 Gold ${state.res.gold}`;
  dom.res.carriers.textContent = `👣 Träger ${state.res.carriers}`;
}
function toolLabel(k){
  return k==='pointer'?'Zeiger':
         k==='road'   ?'Straße':
         k==='hq'     ?'HQ':
         k==='lumber' ?'Holzfäller':
         k==='depot'  ?'Depot':
         k==='erase'  ?'Abriss': k;
}

// Screen ↔ World Konvertierung (ISO), mit Kameraversatz & Zoom, zentriert auf Tile‑Raute
function screenToWorldCell(sx, sy){
  const { cam } = state;
  const z = state.zoom;
  // Canvas‑Pixel → Weltpixel
  const wx = (sx / z) + cam.x;
  const wy = (sy / z) + cam.y;

  const { tw, th } = state.iso;
  // klassische inverse Isometrie (45°/26.565°): von Pixel in Kartenkoordinate
  const halfW = tw/2, halfH = th/2;
  // Ursprung (0,0) an Kachel‑Raster ausrichten
  const i = Math.floor((wx / halfW + wy / halfH) / 2);
  const j = Math.floor((wy / halfH - (wx / halfW)) / 2);
  return {i, j};
}
function worldCellToScreen(i, j){
  const { tw, th } = state.iso;
  const halfW = tw/2, halfH = th/2;
  const px = (i - j) * halfW;
  const py = (i + j) * halfH;
  const z = state.zoom;
  const { cam } = state;
  return { x: (px - cam.x)*z, y:(py - cam.y)*z };
}

// ===== Start / Boot‑Flows =====
export async function startFromOverlay(){
  if (state.started) return;
  // 1) Assets
  await loadAllAssets();

  // 2) Welt und Renderer
  state.world = ensureWorld({ width: 128, height: 128 });
  state.cam   = new Camera();
  state.rnd   = createRenderer(dom.canvas, { IM, iso: state.iso });

  // 3) Erstes HQ in Kartenmitte setzen (Stein‑HQ)
  const cx = Math.floor(state.world.w/2);
  const cy = Math.floor(state.world.h/2);
  setTile(state.world, cx, cy, TILES.HQ_STONE);

  // 4) Kamera so zentrieren, dass HQ mittig im View ist
  centerOnCell(cx, cy);

  // 5) Input (Pan/Zoom/Build)
  setupInput({
    canvas: dom.canvas,
    getTool: ()=>state.tool,
    getZoom: ()=>state.zoom,
    setZoom: (z, pivot)=>applyZoom(z, pivot),
    onPan: (dx, dy)=> panBy(dx, dy),
    onTap: (sx, sy)=> onTapBuild(sx, sy),
  });

  // 6) Tools klicken
  dom.toolsPanel.querySelectorAll('.tool').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      dom.toolsPanel.querySelectorAll('.tool').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      state.tool = btn.dataset.tool;
      updateTopUI();
    });
  });
  dom.centerBtn.addEventListener('click', ()=>centerOnCell(cx, cy));
  dom.dbgBtn.addEventListener('click', ()=>{ state.debug=!state.debug; });

  // 7) Overlay schließen & Canvas Eingaben freigeben
  dom.overlay.style.display = 'none';
  state.started = true;
  updateTopUI();
  window.__enableCanvasPointer?.();

  // 8) Carriers initialisieren (Stub; später echte Logik)
  state.carriers = Carriers.init?.(state.world) || { update:()=>{} };

  // 9) Render‑Loop
  requestAnimationFrame(loop);
}

export async function toggleFullscreen(){
  const el = document.documentElement;
  try{
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }catch(e){ console.warn('Fullscreen failed', e); }
}

// ===== Kamera / Zoom / Pan =====
function centerOnCell(i, j){
  // Welt‑Pixel des Zentrums dieser Zelle
  const { tw, th } = state.iso;
  const halfW = tw/2, halfH = th/2;
  const px = (i - j) * halfW;
  const py = (i + j) * halfH;

  const viewW = dom.canvas.width / state.zoom;
  const viewH = dom.canvas.height / state.zoom;

  state.cam.x = px - viewW/2 + halfW; // Mittelpunkt der Raute
  state.cam.y = py - viewH/2 + halfH/2;
}
function panBy(dx, dy){
  // dx/dy kommen bereits in Canvas‑Pixeln; Kameraraum = Pixel/Zoom
  const z = state.zoom;
  state.cam.x -= dx / z;
  state.cam.y -= dy / z;
}
function applyZoom(nextZoom, pivotScreen){
  const minZ=0.35, maxZ=2.5;
  const nz = clamp(nextZoom, minZ, maxZ);
  const oz = state.zoom;
  if (Math.abs(nz-oz)<1e-4) return;

  // Zoom zum Finger‑Mittelpunkt: Kamera so verschieben, dass der Pivot am selben Weltpunkt bleibt
  const { cam } = state;
  const wx = cam.x + (pivotScreen.x/oz);
  const wy = cam.y + (pivotScreen.y/oz);
  state.zoom = nz;
  cam.x = wx - (pivotScreen.x/nz);
  cam.y = wy - (pivotScreen.y/nz);
  updateTopUI();
}

// ===== Bauen / Tap =====
function onTapBuild(sx, sy){
  if (state.tool==='pointer') return; // nur schieben
  const { i, j } = screenToWorldCell(sx, sy);
  if (i<0||j<0||i>=state.world.w||j>=state.world.h) return;

  if (state.tool==='erase'){
    setTile(state.world, i, j, TILES.GRASS);
    autotileRoad(state.world, i, j);
    return;
  }

  if (state.tool==='road'){
    setTile(state.world, i, j, TILES.ROAD);
    autotileRoad(state.world, i, j);
    return;
  }
  if (state.tool==='hq'){
    setTile(state.world, i, j, TILES.HQ_WOOD);
    return;
  }
  if (state.tool==='lumber'){
    setTile(state.world, i, j, TILES.LUMBER);
    return;
  }
  if (state.tool==='depot'){
    setTile(state.world, i, j, TILES.DEPOT);
    return;
  }
}

// ===== Loop / Render =====
let lastTs=0;
function loop(ts){
  const dt = Math.min(0.05, (ts-lastTs)/1000)||0.016;
  lastTs = ts;

  // Update
  state.carriers?.update?.(dt, state.world);

  // Render
  state.rnd.clear();
  state.rnd.renderWorld(state.world, state.cam, state.zoom, state.iso, { debug: state.debug });
  requestAnimationFrame(loop);
}

// ===== Buttons oben (FS etc.) =====
dom.fsTopBtn?.addEventListener('click', ()=>toggleFullscreen());

// ===== Debug: globale Hilfe =====
window.__app = { state, screenToWorldCell, worldCellToScreen, centerOnCell, applyZoom };
