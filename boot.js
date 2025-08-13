// boot.js – verdrahtet Start/Vollbild/Reset und ruft game.startGame()

import { startGame, resetGame, centerCamera, toggleDebug, setTool } from './game.js?v=14.4';

const $ = (sel) => document.querySelector(sel);

function isFullScreen() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}
async function requestFS() {
  const el = document.documentElement;
  if (!el.requestFullscreen) return el.webkitRequestFullscreen?.();
  return el.requestFullscreen();
}
async function exitFS() {
  if (document.exitFullscreen) return document.exitFullscreen();
  return document.webkitExitFullscreen?.();
}
async function toggleFS() { isFullScreen() ? exitFS() : requestFS(); }

function showHUD(show = true) {
  $('#hudBar').style.opacity = show ? '0.97' : '0';
}

// UI Events
$('#btnFS').addEventListener('click', toggleFS, { passive:true });
$('#fsBtn').addEventListener('click', toggleFS, { passive:true });
$('#btnCenter').addEventListener('click', () => centerCamera(), { passive:true });
$('#btnDebug').addEventListener('click', () => toggleDebug(), { passive:true });
$('#resetBtn').addEventListener('click', () => resetGame(), { passive:true });

// Tool buttons
document.querySelectorAll('#toolBar .btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#toolBar .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setTool(btn.dataset.tool);
  }, { passive:true });
});

// Doppeltipp aufs Canvas → Vollbild
const canvas = $('#game');
let lastTap = 0;
canvas.addEventListener('pointerdown', () => {
  const t = performance.now();
  if (t - lastTap < 300) toggleFS();
  lastTap = t;
}, { passive:true });

// Start
$('#startBtn').addEventListener('click', () => {
  showHUD(true);
  $('#startCard').style.display = 'none';
  startGame({
    canvas,
    DPR: window.devicePixelRatio || 1,
    onHUD: (key, val) => {
      const el = document.querySelector('#hud' + key);
      if (el) el.textContent = String(val);
    }
  });
}, { passive:true });

// Vorab HUD sichtbar (über Start‑Overlay)
showHUD(true);
