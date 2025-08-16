// boot.js (V15)
import { game } from './game.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const ui = {
  canvas: $('#canvas'),
  startCard: $('#startCard'),
  btnStart: $('#btnStart'),
  btnFsStart: $('#btnFs'),
  btnReset: $('#btnReset'),
  btnFull: $('#btnFull'),
  btnCenter: $('#btnCenter'),
  btnDebug: $('#btnDebug'),
  tools: $$('#tools .btn'),
  hud: {
    tool: $('#hudTool'),
    zoom: $('#hudZoom'),
    wood: $('#hudWood'),
    stone: $('#hudStone'),
    carry: $('#hudCarry'),
  },
  debug: $('#debug'),
};

// --- Debug helper
let debugOn = false;
function logDbg(lines) {
  if (!debugOn) return;
  ui.debug.textContent = lines.join('\n');
}

// --- Fullscreen helper (mit iOS/WebKit-Fallback)
async function requestFullscreen() {
  const el = document.documentElement;
  const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (fn) {
    try { await fn.call(el); } catch(e) {/* ignorieren */}
  }
}
function exitFullscreen() {
  const doc = document;
  const fn = doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
  if (fn) { try { fn.call(doc); } catch(e){} }
}

// --- HUD Callback ins Spiel reichen
function onHUD(key, val) {
  if (key === 'Tool') ui.hud.tool.textContent = val;
  if (key === 'Zoom') ui.hud.zoom.textContent = val;
  if (key === 'Wood') ui.hud.wood.textContent = val;
  if (key === 'Stone') ui.hud.stone.textContent = val;
  if (key === 'Carry') ui.hud.carry.textContent = val;
}

// --- Toolbuttons
ui.tools.forEach(btn => {
  btn.addEventListener('click', () => {
    ui.tools.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    game.setTool(btn.dataset.tool);
  });
});

// --- Aktionen rechts
ui.btnCenter.addEventListener('click', () => game.center());
ui.btnDebug.addEventListener('click', () => {
  debugOn = !debugOn;
  ui.btnDebug.classList.toggle('active', debugOn);
  ui.debug.hidden = !debugOn;
  if (debugOn) logDbg(['Debug: AN']);
});
ui.btnFull.addEventListener('click', requestFullscreen);

// --- Startkarte
ui.btnFsStart.addEventListener('click', requestFullscreen);
ui.btnReset.addEventListener('click', () => {
  // einfacher Reset
  location.reload();
});
ui.btnStart.addEventListener('click', () => {
  ui.startCard.style.display = 'none';
  game.startGame({
    canvas: ui.canvas,
    onHUD,
    onDebug: (state) => {
      if (!debugOn) return;
      logDbg([
        `Zoom: ${state.zoom.toFixed(2)}  DPR:${state.dpr.toFixed(2)}`,
        `Cam:  (${state.camX.toFixed(1)}, ${state.camY.toFixed(1)})`,
        `CSS:  ${state.cssW}×${state.cssH}  px`,
        `Tiles:${state.buildings.length} bld / ${state.roads.length} roads`,
        `Tool: ${state.tool}`,
        `PointerMode: pan=${state.panning}`,
      ]);
    }
  });
});

// Erststatus
ui.hud.tool.textContent = 'Zeiger';
ui.hud.zoom.textContent = '1.00x';
