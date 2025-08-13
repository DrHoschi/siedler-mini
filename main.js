// main.js – V14.2
// Bootstrapping: Assets laden, Game + Renderer bauen, Loop starten, UI verdrahten

import { IM, loadAllAssets }   from './core/assets.js';
import { Camera }              from './core/camera.js';
import { Input }               from './core/input.js';
import { Carriers }            from './core/carriers.js';
import { Game }                from './game.js';
import { createRenderer }      from './render.js';

const VERSION = 'V14.2';

function $(sel) { return document.querySelector(sel); }

const state = {
  tool: 'pointer',        // 'pointer' | 'road' | 'hq' | 'lumberjack' | 'depot' | 'demolish'
  game: null,
  camera: null,
  input: null,
  carriers: null,
  renderer: null,
  running: false,
};

async function boot() {
  // Lazy UI labels (falls vorhanden)
  const ver = document.querySelector('.js-version');
  if (ver) ver.textContent = 'JS ' + VERSION;

  // Canvas erzeugen (falls nicht in index.html vorhanden)
  let canvas = $('#game');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'game';
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
  }

  // Assets laden (mit simpler Fortschrittsanzeige im Titel, optional)
  await loadAllAssets();

  // Welt anlegen (Tiles), Rendering‑Größe
  const worldTilesW = 64, worldTilesH = 64;     // feste Größe
  const tileDX = 64, tileDY = 32;               // isometrische Projektion
  const worldPxW = worldTilesW * tileDX;
  const worldPxH = worldTilesH * tileDY;

  // Canvas‑Größe an Viewport koppeln
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth  || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    state.renderer && state.renderer.setSize(canvas.width, canvas.height, dpr);
    state.camera && state.camera.resize(canvas.width / dpr, canvas.height / dpr);
  }

  // Camera + Game + Renderer
  state.camera   = new Camera(window.innerWidth, window.innerHeight, worldPxW, worldPxH);
  state.game     = new Game(worldTilesW, worldTilesH, tileDX, tileDY, IM, state.camera);
  state.carriers = new Carriers(state.game, state.game.findRoadPath);
  state.renderer = createRenderer(canvas, IM, state);

  // Input verdrahten
  state.input = new Input(() => ({
    tool: state.tool,
    camera: state.camera,
    pickAtScreen: (sx, sy) => state.game.pickAtScreen(sx, sy),
    buildAtWorld: (wx, wy, tx, ty) => state.game.buildAtWorld(state.tool, tx, ty),
    demolishAtWorld: (wx, wy, tx, ty) => state.game.demolishAtWorld(tx, ty),
  }));
  state.input.attach(canvas);

  // HQ mittig setzen
  const mid = state.game.centerTile();
  state.game.placeHQ(mid.x, mid.y, /*stone=*/true);
  state.camera.centerOn(mid.wx, mid.wy);

  // Buttons (optional vorhanden)
  $('#btn-start')?.addEventListener('click', start);
  $('#btn-fullscreen')?.addEventListener('click', toggleFullscreen);
  $('#btn-reset')?.addEventListener('click', () => location.reload());

  // Tool‑Buttons (optional vorhanden)
  $('#tool-pointer')?.addEventListener('click', () => state.tool = 'pointer');
  $('#tool-road')?.addEventListener('click',    () => state.tool = 'road');
  $('#tool-hq')?.addEventListener('click',      () => state.tool = 'hq');
  $('#tool-lumber')?.addEventListener('click',  () => state.tool = 'lumberjack');
  $('#tool-depot')?.addEventListener('click',   () => state.tool = 'depot');
  $('#tool-demolish')?.addEventListener('click',() => state.tool = 'demolish');

  window.addEventListener('resize', resizeCanvas, {passive:true});
  resizeCanvas();

  // Autostart, wenn kein Start‑Dialog
  if (!$('#btn-start')) start();
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.();
  else document.exitFullscreen?.();
}

let _rafId = 0, _last = 0;
function start() {
  if (state.running) return;
  state.running = true;
  _last = performance.now();
  const loop = (t) => {
    const dt = Math.min(0.05, (t - _last) / 1000);
    _last = t;
    // Update
    state.game.update(dt);
    state.carriers.update(dt);
    // Render
    state.renderer.draw();
    _rafId = requestAnimationFrame(loop);
  };
  _rafId = requestAnimationFrame(loop);
}

function stop() {
  if (_rafId) cancelAnimationFrame(_rafId);
  state.running = false;
}

// Exporte + Globale Fallbacks (damit index.html flexibel bleibt)
export const main = { boot, start, stop, toggleFullscreen, state };
window.main = { boot, start, stop, toggleFullscreen, state };

// Auto‑Boot sobald DOM da ist
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, {once:true});
} else {
  boot();
}
