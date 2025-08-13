// main.js  —  V13.8.2-Fix
import { loadAllAssets, IM }   from './core/assets.js';
import { createCamera }        from './core/camera.js';
import { attachInput }         from './core/input.js';
import { createRenderer }      from './render.js';
import { createWorld }         from './world.js';

const state = {
  canvas: null,
  ctx: null,
  renderer: null,
  cam: null,
  world: null,
  hudCb: ()=>{},
  tool: 'pointer', // 'pointer'|'road'|'hq'|'lumber'|'depot'|'bulldoze'
  running: false,
  last: 0,
};

export function onHud(fn){ state.hudCb = fn || (()=>{}); }
export function setTool(t){ state.tool = t; }
export function toggleFullscreen(){
  const el = document.documentElement;
  if (!document.fullscreenElement) { el.requestFullscreen?.(); }
  else { document.exitFullscreen?.(); }
}
export function centerOnHQ(){
  if (!state.world) return;
  const hq = state.world.getHQ();
  if (!hq) return;
  const center = state.renderer.worldToScreen(hq.x, hq.y, state.cam);
  // schiebe so, dass HQ mittig erscheint
  const cx = state.canvas.width  * 0.5;
  const cy = state.canvas.height * 0.5;
  state.cam.x += (cx - center.x);
  state.cam.y += (cy - center.y);
}

export async function start(){
  if (state.running) return;

  // Canvas
  state.canvas = document.getElementById('canvas');
  state.ctx = state.canvas.getContext('2d', { alpha:true, desynchronized:true });
  resize(); addEventListener('resize', resize);

  // Assets laden
  await loadAllAssets();

  // Kamera
  state.cam = createCamera({
    x: 0, y: 0, zoom: 1,
    minZoom: 0.35, maxZoom: 2.2
  });

  // Welt + Renderer
  state.world = createWorld({ width: 120, height: 120 }); // feste Größe fürs Erste
  state.renderer = createRenderer(state.canvas, IM);

  // Erstes HQ mittig in der Welt platzieren (Stein-Variante)
  const midX = Math.floor(state.world.width/2);
  const midY = Math.floor(state.world.height/2);
  state.world.placeHQ(midX, midY, 'stone'); // erwartet hq_stone.png in /assets/

  // Kamera grob aufs HQ ausrichten
  centerOnHQ();

  // Eingaben verbinden
  attachInput(state.canvas, {
    getTool: () => state.tool,
    getCam:  () => state.cam,
    // Build tap
    onTap: (sx,sy)=>{
      if (state.tool==='pointer') return; // im Pointer nix bauen
      const {x, y} = state.renderer.screenToWorld(sx, sy, state.cam);
      const gx = Math.round(x);
      const gy = Math.round(y);
      if (state.tool==='road')   state.world.placeRoad(gx, gy);
      if (state.tool==='hq')     state.world.placeHQ(gx, gy, 'wood');
      if (state.tool==='lumber') state.world.placeLumberjack(gx, gy);
      if (state.tool==='depot')  state.world.placeDepot(gx, gy);
      if (state.tool==='bulldoze') state.world.removeAt(gx, gy);
    },
    // Pan nur im Zeiger-Tool
    canPan: ()=> state.tool==='pointer',
    onZoom: (factor, cx, cy)=>{
      const before = state.renderer.screenToWorld(cx, cy, state.cam);
      state.cam.zoom = Math.max(state.cam.minZoom, Math.min(state.cam.maxZoom, state.cam.zoom * factor));
      const after  = state.renderer.screenToWorld(cx, cy, state.cam);
      // „Zoom zum Finger“: Kamera so verschieben, dass der Punkt unter dem Finger bleibt
      state.cam.x += ( (after.x - before.x) * state.renderer.tileW );
      state.cam.y += ( (after.y - before.y) * state.renderer.tileH );
    },
    onPan: (dx,dy)=>{ state.cam.x += dx; state.cam.y += dy; }
  });

  // Loop
  state.running = true;
  state.last = performance.now();
  requestAnimationFrame(loop);
}

function loop(ts){
  if (!state.running) return;
  const dt = Math.min(0.05, (ts - state.last)/1000);
  state.last = ts;

  // Update
  state.world.update(dt);

  // Render
  state.renderer.clear();
  state.renderer.drawTerrain(state.world, state.cam);
  state.renderer.drawRoads(state.world, state.cam);
  state.renderer.drawBuildings(state.world, state.cam);
  state.renderer.drawUnits(state.world, state.cam); // Träger etc., falls vorhanden

  // HUD
  state.hudCb({
    wood: state.world.res.wood|0,
    stone: state.world.res.stone|0,
    food: state.world.res.food|0,
    gold: state.world.res.gold|0,
    carriers: state.world.units.length|0,
    zoom: state.cam.zoom
  });

  requestAnimationFrame(loop);
}

function resize(){
  if (!state.canvas) return;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = Math.floor(innerWidth  * dpr);
  const h = Math.floor(innerHeight * dpr);
  state.canvas.width  = w;
  state.canvas.height = h;
  state.canvas.style.width  = '100vw';
  state.canvas.style.height = '100vh';
}
