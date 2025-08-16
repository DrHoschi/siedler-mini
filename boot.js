// Siedler‑Mini V15 – Bootstrapping
import { world } from './world.js';
import { input } from './input.js';

// ---- DOM-Griffe
const canvas   = document.getElementById('canvas');
const btnStart = document.getElementById('btnStart');
const btnFs    = document.getElementById('btnFs');
const btnReset = document.getElementById('btnReset');
const btnFull  = document.getElementById('btnFull');   // HUD oben rechts
const btnCenter= document.getElementById('btnCenter');
const btnDebug = document.getElementById('btnDebug');
const startCard= document.getElementById('startCard');

// Tool-Leiste (Buttons mit data-tool)
const toolsBar = document.getElementById('tools');
const hudZoom  = document.getElementById('hudZoom');
const hudTool  = document.getElementById('hudTool');

// Debug-Ecke dynamisch anlegen (unten links)
let dbgEl = document.getElementById('dbgPane');
if (!dbgEl) {
  dbgEl = document.createElement('div');
  dbgEl.id = 'dbgPane';
  Object.assign(dbgEl.style,{
    position:'fixed', left:'8px', bottom:'8px', maxWidth:'60vw',
    background:'rgba(0,0,0,.55)', border:'1px solid #31445f',
    borderRadius:'8px', padding:'6px 8px', color:'#cfe3ff',
    font:'12px/16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    whiteSpace:'pre-wrap', pointerEvents:'none', zIndex: 4, display:'none'
  });
  document.body.appendChild(dbgEl);
}
let debugOn = false;
function logDbg(lines) {
  if (!debugOn) return;
  dbgEl.style.display = 'block';
  dbgEl.textContent = lines.join('\n');
}

// ---- Vollbild-Toggle (ein Codepfad für beide Buttons)
async function toggleFullscreen() {
  const root = document.documentElement; // oder canvas.parentNode
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (root.requestFullscreen) await root.requestFullscreen();
      else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    }
  } catch (e) {
    // iOS iPhone unterstützt kein echtes Fullscreen per JS → leise ignorieren
    console.warn('Fullscreen not available:', e);
  }
}

// ---- HUD Writer
function onHUD(k,v) {
  if (k === 'Zoom' && hudZoom) hudZoom.textContent = v;
  if (k === 'Tool' && hudTool) hudTool.textContent = v;
}

// ---- Button‑Handler
btnFs?.addEventListener('click', toggleFullscreen);
btnFull?.addEventListener('click', toggleFullscreen);

btnReset?.addEventListener('click', () => {
  // Soft-Reset: Welt und Kamera neu
  world.softReset();
  input.attach(canvas, world); // re-bind Input falls nötig
  logDbg(['Reset durchgeführt']);
});

btnCenter?.addEventListener('click', () => {
  world.centerOnContent();
});

btnDebug?.addEventListener('click', () => {
  debugOn = !debugOn;
  if (!debugOn) { dbgEl.style.display = 'none'; return; }
  // einmal sofort rendern
  const s = world.state();
  logDbg([
    `DBG ON  | DPR=${s.DPR.toFixed(2)}  Size=${s.width}x${s.height}`,
    `cam=(${s.camX.toFixed(1)}, ${s.camY.toFixed(1)}) zoom=${s.zoom.toFixed(2)}`,
    `tiles=${s.tileSize}   roads=${s.roads.length}   buildings=${s.buildings.length}`,
    `tool=${s.tool}`
  ]);
});

// Tools
toolsBar?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tool]');
  if (!b) return;
  for (const btn of toolsBar.querySelectorAll('.btn')) btn.classList.remove('active');
  b.classList.add('active');
  const name = b.getAttribute('data-tool');
  world.setTool(name);
  onHUD('Tool',
    name==='pointer' ? 'Zeiger' :
    name==='road' ? 'Straße' :
    name==='hq' ? 'HQ' :
    name==='woodcutter' ? 'Holzfäller' :
    name==='depot' ? 'Depot' : 'Abriss'
  );
});

// Start: Welt initialisieren und Overlay schließen
btnStart?.addEventListener('click', () => {
  startCard.style.display = 'none';

  world.start({
    canvas,
    onHUD,
    onDebug: () => {
      if (!debugOn) return;
      const s = world.state();
      logDbg([
        `DBG ON  | DPR=${s.DPR.toFixed(2)}  Size=${s.width}x${s.height}`,
        `cam=(${s.camX.toFixed(1)}, ${s.camY.toFixed(1)}) zoom=${s.zoom.toFixed(2)}`,
        `tiles=${s.tileSize}   roads=${s.roads.length}   buildings=${s.buildings.length}`,
        `tool=${s.tool}`
      ]);
    }
  });

  input.attach(canvas, world);
  world.placeInitialHQ();      // HQ (Stein) mittig setzen
  world.centerOnContent();     // Kamera aufs HQ
});

// Beim Laden schon mal minimal initialisieren (nur Grid/Platzhalter)
world.bootstrap(canvas, onHUD);
