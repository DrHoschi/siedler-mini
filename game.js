// /game.js  — V14.3 voll verdrahtet
// Startet das Spiel, lädt Assets, richtet Kamera+Input ein und ruft render.draw()

import Camera from './core/camera.js';
import Input  from './core/input.js';
import { loadAllAssets } from './core/assets.js';
import Renderer from './render.js';

// --- Spielzustand -----------------------------------------------------------
const T = 64;                // Tile-Größe (px)
const MAP_W = 32, MAP_H = 32;

function makeWorld() {
  // einfache Ground-Map (0 = Gras)
  const ground = new Array(MAP_H).fill(0).map(() => new Array(MAP_W).fill(0));
  // ein initiales HQ ungefähr mittig
  const hq = { x: Math.floor(MAP_W/2), y: Math.floor(MAP_H/2), type: 'hq_stone' };
  const buildings = [hq];
  const roads = []; // {x,y} Liste – kann deine Straßenlogik später füllen
  return { tiles: {w:MAP_W, h:MAP_H, size:T}, ground, buildings, roads };
}

// --- HUD-Helfer -------------------------------------------------------------
function bindHUD(onHUD, getState) {
  if (!onHUD) return;
  const api = {
    wood:  () => getState().res.wood,
    stone: () => getState().res.stone,
    food:  () => getState().res.food,
    gold:  () => getState().res.gold,
    car:   () => getState().carrier,
    tool:  () => getState().tool,
    zoom:  () => getState().camera.zoom.toFixed(2) + 'x',
  };
  onHUD(api);
}

// --- öffentliche Startfunktion ---------------------------------------------
export async function startGame(opts = {}) {
  const {
    canvas,
    DPR = 1,
    onHUD,           // Funktion, die HUD-Werte setzt (kommt aus boot.js)
    // centerMap wird _optional_ als Platzhalter belegt (siehe unten)
  } = opts;

  if (!canvas) throw new Error('canvas fehlt');

  // 1) Assets laden (lädt Platzhalter, falls eine Textur fehlt)
  await loadAllAssets();

  // 2) Welt erzeugen
  const world = makeWorld();

  // 3) Kamera einrichten
  const viewW = Math.floor(canvas.clientWidth  * DPR);
  const viewH = Math.floor(canvas.clientHeight * DPR);
  const worldPxW = world.tiles.w * T;
  const worldPxH = world.tiles.h * T;

  const camera = new Camera(viewW, viewH, worldPxW, worldPxH);
  camera.centerOn((worldPxW/2)|0, (worldPxH/2)|0);

  // 4) Renderer
  const ctx = canvas.getContext('2d');
  const renderer = new Renderer(ctx, T);

  // 5) Spiel‑State
  const state = {
    // Ressourcen (nur Dummy – kann später aus deiner Logik kommen)
    res: { wood: 0, stone: 0, food: 0, gold: 0 },
    carrier: 0,

    tool: 'pointer',       // 'pointer' | 'road' | 'hq' | 'lumber' | 'depot' | 'erase'
    debug: false,

    world, camera, ctx, DPR,
    // kleine Helfer um im Render/Input schnell auf State zuzugreifen
    setTool(name){ this.tool = name; },
  };

  // HUD verbinden
  bindHUD(onHUD, () => state);

  // 6) Input
  const input = new Input(() => state);
  input.attach(canvas);

  // 7) Buttons (linke Tool-Leiste)
  const id = s => document.getElementById(s);
  const toolBtns = [
    ['toolPointer','pointer'],
    ['toolRoad','road'],
    ['toolHQ','hq'],
    ['toolLumber','lumber'],
    ['toolDepot','depot'],
    ['toolErase','erase'],
  ];
  for (const [btnId, toolName] of toolBtns) {
    const el = id(btnId);
    if (!el) continue;
    el.onclick = () => {
      state.tool = toolName;
      // visuelles „active“
      toolBtns.forEach(([id2, t]) => {
        const b = id(id2); if (b) b.classList.toggle('active', t === toolName);
      });
    };
  }

  // 8) Zentrieren & Debug & Vollbild oben rechts (falls vorhanden)
  const centerBtn = id('centerBtn');
  if (centerBtn) centerBtn.onclick = () => {
    camera.centerOn((worldPxW/2)|0, (worldPxH/2)|0);
  };
  const dbgBtn = id('dbgBtn');
  if (dbgBtn) dbgBtn.onclick = () => state.debug = !state.debug;
  const fsBtnTop = id('fsBtnTop');
  if (fsBtnTop) fsBtnTop.onclick = async () => {
    const docEl = document.documentElement;
    if (!document.fullscreenElement && docEl.requestFullscreen) await docEl.requestFullscreen();
    else if (document.exitFullscreen) await document.exitFullscreen();
  };

  // 9) Resize
  function resize() {
    const w = Math.floor(canvas.clientWidth * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (w && h) {
      canvas.width = w; canvas.height = h;
      camera.resize(w, h);
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // 10) Zeichenschleife
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // (hier könnte später Logik/Träger‑Update laufen)
    renderer.draw(state);  // Boden, Gebäude, Debug etc.

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 11) Optional: centerMap‑Platzhalter bereitstellen (boot.js nutzt es evtl.)
  window.main.centerMap = () => {
    camera.centerOn((worldPxW/2)|0, (worldPxH/2)|0);
  };
}
