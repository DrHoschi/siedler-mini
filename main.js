// main.js — V14.3
// Stellt window.main.run() bereit, das von boot.js aufgerufen wird.
// Lädt dann dein Spiel (game.js) und übergibt Canvas, DPR & HUD-Callback.

import { } from './render.js?v=14.3'; // (nur damit der Renderer sicher vorgeladen ist)
                                       // wenn dein render nichts exportiert, ist das ok.

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

function resizeCanvas(canvas) {
  const DPR = Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 1)));
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  canvas.style.width  = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width  = Math.floor(cssW * DPR);
  canvas.height = Math.floor(cssH * DPR);
  return DPR;
}

function showHUD(on) {
  const bar = $('#uiBar');
  bar.style.opacity = on ? '1' : '0';
}

function drawPlaceholder(ctx, canvas) {
  ctx.save();
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // schräge Kacheln als Dummy
  const s = 64 * Math.max(1, Math.floor((window.devicePixelRatio||1)));
  ctx.translate((canvas.width % s)/2, (canvas.height % s)/2);
  for (let y = -s; y < canvas.height + s; y += s) {
    for (let x = -s; x < canvas.width + s; x += s) {
      ctx.fillStyle = ( ((x+y)/s) % 2 === 0 ) ? '#1a2b3d' : '#142433';
      ctx.fillRect(x, y, s, s);
    }
  }
  ctx.restore();

  ctx.fillStyle = '#3fc3ff';
  ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('Platzhalter …', 16, 28);
}

// HUD-Bridge (Game -> DOM)
function makeHudBridge() {
  const map = {
    wood  : $('#hudWood'),
    stone : $('#hudStone'),
    food  : $('#hudFood'),
    gold  : $('#hudGold'),
    car   : $('#hudCar'),
    tool  : $('#hudTool'),
    zoom  : $('#hudZoom'),
  };
  return (key, val) => {
    const el = map[key];
    if (!el) return;
    if (typeof val === 'number' && key === 'zoom') {
      el.textContent = val.toFixed(2) + 'x';
    } else {
      el.textContent = String(val);
    }
  };
}

async function run() {
  try {
    const canvas = $('#game');
    if (!canvas) throw new Error('Canvas #game fehlt.');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas.getContext("2d") fehlgeschlagen.');

    const DPR = resizeCanvas(canvas);
    showHUD(false);
    $('#startOverlay').style.display = 'none';

    // Placeholder bis game.js übernimmt
    drawPlaceholder(ctx, canvas);

    // dynamisch dein Spiel laden
    const { startGame } = await import('./game.js?v=14.3');
    if (typeof startGame !== 'function') {
      throw new Error('startGame() fehlt in game.js');
    }

    // HUD-Adapter übergeben
    await startGame({
      canvas,
      DPR,
      onHud : makeHudBridge(),
      onResize: () => resizeCanvas(canvas),
    });

    showHUD(true);
  } catch (err) {
    // Start wieder anzeigen & Fehler poppen (wie von dir gewünscht)
    $('#startOverlay').style.display = '';
    showHUD(false);
    alert(`Startfehler: ${err.message || err}`);
    console.error(err);
  }
}

// optional: für „Zentrieren“-Button eine Platzhalter‑Funktion
function centerMap() {
  // dein game.js kann diese Funktion später überschreiben (window.main.centerMap = ...)
  // hier nur ein minimaler Effekt: kurz Placeholder neu zeichnen
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');
  drawPlaceholder(ctx, canvas);
}

window.addEventListener('resize', () => {
  const canvas = $('#game');
  if (!canvas) return;
  resizeCanvas(canvas);
});

// API, die boot.js aufruft
window.main = { run, centerMap };
