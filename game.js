// game.js — V14.3
// Exportiert startGame(opts), sodass main.js -> game.startGame(opts) aufrufen kann.

import Camera from './core/camera.js?v=14.3';
import Input  from './core/input.js?v=14.3';
// (optional – wird später fürs Träger‑Feature genutzt)
// import Carriers from './core/carriers.js?v=14.3';
import { createRenderer } from './render.js?v=14.3';

export async function startGame(opts = {}) {
  // opts kommt aus main.run(): { canvas, DPR, onHUD, onHudSet, ... }
  const canvas = opts.canvas || document.getElementById('game');
  if (!canvas) throw new Error('Canvas #game fehlt');
  const DPR = opts.DPR || (window.devicePixelRatio || 1);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('ctx fehlt');

  // Start-Overlay ausblenden
  const overlay = document.getElementById('startOverlay');
  if (overlay) overlay.style.display = 'none';

  // HUD einblenden
  const uiBar = document.getElementById('uiBar');
  if (uiBar) uiBar.style.opacity = '0.95';

  // Welt (ganz simpel)
  const world = {
    tileSize: 48,       // logische Kachelgröße (wird vom Renderer skaliert)
    cols: 26,
    rows: 18,
    buildings: [],      // {type:'hq'|'lumber'|'depot', x,y}
    roads: new Set(),   // key "x,y"
    zoom: 1,
  };

  // Kamera
  const camera = new Camera(canvas.width, canvas.height, world.cols * world.tileSize, world.rows * world.tileSize);
  camera.zoom = 1;
  camera.centerOn((world.cols * world.tileSize) / 2, (world.rows * world.tileSize) / 2);

  // Renderer
  const renderer = createRenderer(canvas, ctx, world, camera, DPR);

  // Tool-Status
  const state = {
    tool: 'pointer', // 'pointer' | 'road' | 'hq' | 'lumber' | 'depot' | 'demolish'
  };

  // HUD-Text setzen (nur wenn vorhanden)
  const setHUD = (key, val) => {
    const el = document.getElementById(key);
    if (el) el.textContent = String(val);
  };
  // Erstwerte
  setHUD('hudWood', 0);
  setHUD('hudStone', 0);
  setHUD('hudFood', 0);
  setHUD('hudGold', 0);
  setHUD('hudCar',  0);
  document.getElementById('hudTool')?.replaceChildren(document.createTextNode('Zeiger'));
  document.getElementById('hudZoom')?.replaceChildren(document.createTextNode('1.00x'));

  // Buttons (links)
  const btns = {
    pointer: document.getElementById('toolPointer'),
    road:    document.getElementById('toolRoad'),
    hq:      document.getElementById('toolHQ'),
    lumber:  document.getElementById('toolLumber'),
    depot:   document.getElementById('toolDepot'),
    demolish:document.getElementById('toolErase'),
  };
  function activateTool(t) {
    state.tool = t;
    Object.entries(btns).forEach(([k, b]) => b?.classList.toggle('active', k === t));
    const name = t === 'pointer' ? 'Zeiger' :
                 t === 'road'    ? 'Straße' :
                 t === 'hq'      ? 'HQ' :
                 t === 'lumber'  ? 'Holzfäller' :
                 t === 'depot'   ? 'Depot' :
                 t === 'demolish'? 'Abriss' : t;
    document.getElementById('hudTool')?.replaceChildren(document.createTextNode(name));
  }
  btns.pointer?.addEventListener('click', () => activateTool('pointer'));
  btns.road?.addEventListener('click',    () => activateTool('road'));
  btns.hq?.addEventListener('click',      () => activateTool('hq'));
  btns.lumber?.addEventListener('click',  () => activateTool('lumber'));
  btns.depot?.addEventListener('click',   () => activateTool('depot'));
  btns.demolish?.addEventListener('click',() => activateTool('demolish'));
  activateTool('pointer');

  // „Zentrieren“-Button (oben rechts)
  document.getElementById('centerBtn')?.addEventListener('click', () => {
    camera.centerOn((world.cols * world.tileSize) / 2, (world.rows * world.tileSize) / 2);
  });

  // (Optional) Debug‑Anzeige oben rechts
  document.getElementById('dbgBtn')?.addEventListener('click', () => {
    renderer.toggleDebug();
  });

  // Fullscreen oben rechts (zusätzlich zum Start‑Overlay)
  document.getElementById('fsBtnTop')?.addEventListener('click', () => {
    if (!document.fullscreenElement && canvas.requestFullscreen) canvas.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  });

  // Input (Touch/Pointer)
  const input = new Input(() => ({ tool: state.tool, camera, pickAtScreen, demolishAtWorld, buildAtWorld }));
  input.attach(canvas);

  function worldToTile(wx, wy) {
    const ts = world.tileSize;
    return { tx: Math.floor(wx / ts), ty: Math.floor(wy / ts) };
  }
  function inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < world.cols && ty < world.rows;
  }
  function pickAtScreen(screenx, screeny) {
    const wx = camera.x + screenx / camera.zoom;
    const wy = camera.y + screeny / camera.zoom;
    const { tx, ty } = worldToTile(wx, wy);
    if (!inBounds(tx, ty)) return null;
    return { wx, wy, tx, ty };
  }

  function key(x, y) { return `${x},${y}`; }

  function buildAtWorld(wx, wy, tx, ty) {
    // Baut je nach Tool
    if (!inBounds(tx, ty)) return;

    if (state.tool === 'road') {
      world.roads.add(key(tx, ty));
      return;
    }
    if (state.tool === 'hq') {
      world.buildings.push({ type: 'hq', x: tx, y: ty });
      return;
    }
    if (state.tool === 'lumber') {
      world.buildings.push({ type: 'lumber', x: tx, y: ty });
      return;
    }
    if (state.tool === 'depot') {
      world.buildings.push({ type: 'depot', x: tx, y: ty });
      return;
    }
  }

  function demolishAtWorld(wx, wy, tx, ty) {
    // Großzügig: Straße oder Gebäude auf dieser Kachel entfernen
    if (!inBounds(tx, ty)) return;
    world.roads.delete(key(tx, ty));
    const idx = world.buildings.findIndex(b => b.x === tx && b.y === ty);
    if (idx >= 0) world.buildings.splice(idx, 1);
  }

  // Fenster-/Canvas‑Resize
  function resize() {
    const w = Math.floor(canvas.clientWidth  * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (w && h) {
      canvas.width  = w;
      canvas.height = h;
      camera.resize(w, h);
      document.getElementById('hudZoom')?.replaceChildren(
        document.createTextNode(`${camera.zoom.toFixed(2)}x`)
      );
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // Ein HQ mittig voraussetzen (wie im Text)
  const cx = Math.floor(world.cols / 2);
  const cy = Math.floor(world.rows / 2);
  world.buildings.push({ type: 'hq', x: cx, y: cy });

  // Render‑Loop
  let last = performance.now();
  function frame(now) {
    const dt = (now - last) / 1000;
    last = now;

    renderer.draw(dt);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Öffentlich (falls später gebraucht)
  return {
    world,
    camera,
    renderer,
    setTool: activateTool,
  };
}
