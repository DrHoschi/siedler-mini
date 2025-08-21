// boot.js — App‑Start, Input, Debug, Query‑Params, Map‑Wechsel
import { loadAndPrepareMap, renderView } from './tools/map-runtime.js';

/* -----------------------------------------------------------
   Globale App‑State
----------------------------------------------------------- */
const cv = document.getElementById('game');
const ctx = cv.getContext('2d', { alpha:false });
ctx.imageSmoothingEnabled = false;

const debugEl  = document.getElementById('debug');
const statusEl = document.getElementById('status');
const btnStart = document.getElementById('btnStart');
const btnReload= document.getElementById('btnReload');
const selMap   = document.getElementById('selMap');
const btnDbgT  = document.getElementById('debugToggle');

const buildPanel = document.getElementById('build');
let currentBrush = 'grass'; // „Bauen“‑Dummy

// Kamera (Welt‑Koords), Welt‑Zoom
const camera = { x:0, y:0, zoom:1 };

// Aktuelle Welt / Assets
let world = null;     // { view:{fullCanvas,width,height,tileSize}, mapUrl, ... }
let running = false;  // Render‑Loop
let lastTS = 0;

// Logging mit Bereich (boot/net/game/atlas/diag)
function log(tag, msg) {
  const now = new Date();
  const t = now.toTimeString().slice(0,8);
  debugEl.textContent += `[${t}] ${tag}: ${msg}\n`;
  debugEl.scrollTop = debugEl.scrollHeight;
}
function diag(msg){ log('diag', msg); }
function boot(msg){ log('boot', msg); }
function game(msg){ log('game', msg); }
function net (msg){ log('net ', msg); }
function atlas(msg){ log('atlas', msg); }

/* -----------------------------------------------------------
   Debug‑Overlay toggeln (F2 + Button)
----------------------------------------------------------- */
let debugVisible = true;
function setDebugVisible(v){
  debugVisible = v;
  debugEl.style.display = v ? 'block' : 'none';
}
btnDbgT.addEventListener('click', ()=> setDebugVisible(!debugVisible));
window.addEventListener('keydown', (e)=>{
  if (e.key === 'F2') setDebugVisible(!debugVisible);
});

/* -----------------------------------------------------------
   Viewport / Canvas sizing (HiDPI)
----------------------------------------------------------- */
function fitCanvas(){
  const dpr = devicePixelRatio || 1;
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  cv.width  = Math.max(1, Math.floor(w * dpr));
  cv.height = Math.max(1, Math.floor(h * dpr));
  ctx.setTransform(1,0,0,1,0,0);
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', fitCanvas);

/* -----------------------------------------------------------
   Query‑Params (Karte/Tileset wählen, Bust)
   Beispiele:
   ?map=assets/maps/map-pro.json
   ?map=assets/maps/map-demo.json&v=3
----------------------------------------------------------- */
function getParams(){
  const u = new URL(location.href);
  return {
    map:  u.searchParams.get('map')  || 'assets/maps/map-pro.json',
    bust: u.searchParams.get('v')    || '',
  };
}

/* -----------------------------------------------------------
   UI: Map‑Dropdown befüllen (kannst du beliebig erweitern)
----------------------------------------------------------- */
function initMapSelector(defaultMap){
  const options = [
    ['assets/maps/map-pro.json',  'map-pro.json'],
    ['assets/maps/map-demo.json', 'map-demo.json'],
  ];
  selMap.innerHTML = options.map(([v,l]) =>
    `<option value="${v}" ${v===defaultMap?'selected':''}>${l}</option>`).join('');

  selMap.addEventListener('change', ()=>{
    // URL Query aktualisieren (History pushen)
    const url = new URL(location.href);
    url.searchParams.set('map', selMap.value);
    history.pushState({}, '', url);
  });
}

/* -----------------------------------------------------------
   Input: Pan & Zoom (nur Canvas, nicht die Seite)
----------------------------------------------------------- */
// Browser‑Gesten‑Zoom weg
document.addEventListener('gesturestart', e=>e.preventDefault(), {passive:false});
document.addEventListener('gesturechange',e=>e.preventDefault(), {passive:false});
document.addEventListener('gestureend',  e=>e.preventDefault(), {passive:false});

// Wheel‑Zoom
cv.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const zf = Math.exp(-e.deltaY * 0.0015);
  zoomAroundPoint(e.clientX, e.clientY, zf);
}, {passive:false});

// Touch: 1 Finger pan, 2 Finger pinch
let touchMode = 0; // 0=none, 1=drag, 2=pinch
let tLast = [];
function copyTouch(t){ return { id:t.identifier, x:t.clientX, y:t.clientY }; }

cv.addEventListener('touchstart', (e)=>{
  e.preventDefault();
  if (e.touches.length===1){ touchMode=1; tLast=[copyTouch(e.touches[0])]; }
  else if (e.touches.length>=2){ touchMode=2; tLast=[copyTouch(e.touches[0]), copyTouch(e.touches[1])]; }
}, {passive:false});

cv.addEventListener('touchmove', (e)=>{
  e.preventDefault();
  if (touchMode===1 && e.touches.length===1){
    const t = copyTouch(e.touches[0]); const p=tLast[0];
    const dx = (t.x - p.x) / (camera.zoom * (devicePixelRatio||1));
    const dy = (t.y - p.y) / (camera.zoom * (devicePixelRatio||1));
    camera.x -= dx; camera.y -= dy; tLast=[t];
  } else if (touchMode===2 && e.touches.length>=2){
    const a = copyTouch(e.touches[0]), b = copyTouch(e.touches[1]);
    const pa=tLast[0], pb=tLast[1];
    const dist = Math.hypot(a.x-b.x, a.y-b.y);
    const pDist= Math.hypot(pa.x-pb.x, pa.y-pb.y);
    if (pDist>0){
      const zf = dist/pDist;
      // zoom um Mitte der zwei Finger
      const cx = (a.x+b.x)/2, cy=(a.y+b.y)/2;
      zoomAroundPoint(cx, cy, zf);
    }
    tLast=[a,b];
  }
}, {passive:false});

cv.addEventListener('touchend', (e)=>{
  e.preventDefault(); touchMode=0; tLast=[];
}, {passive:false});

// Zoom um einen Bildschirm‑Punkt (Client‑Koordinate)
function zoomAroundPoint(clientX, clientY, zf){
  const dpr = devicePixelRatio||1;
  const rect = cv.getBoundingClientRect();
  // Bildschirm‑Punkt -> Welt‑Koord
  const sx = (clientX - rect.left) * dpr;
  const sy = (clientY - rect.top ) * dpr;

  // aktuelle Welt‑Koord dieses Punktes
  const wx = camera.x + sx / (camera.zoom * dpr);
  const wy = camera.y + sy / (camera.zoom * dpr);

  // neue Zoomstufe clampen
  const old = camera.zoom;
  camera.zoom = Math.min(4, Math.max(0.25, camera.zoom * zf));

  // Kamera so verschieben, dass Bildschirm‑Punkt auf gleicher Welt‑Koord bleibt
  camera.x = wx - sx / (camera.zoom * dpr);
  camera.y = wy - sy / (camera.zoom * dpr);
}

/* -----------------------------------------------------------
   Bau‑Panel (Dummy): Brush wählen (später: Mal‑Funktion)
----------------------------------------------------------- */
buildPanel.querySelectorAll('.swatch').forEach(el=>{
  el.addEventListener('click', ()=>{
    buildPanel.querySelectorAll('.swatch').forEach(x=>x.classList.remove('active'));
    el.classList.add('active');
    currentBrush = el.dataset.key;
  });
});
buildPanel.querySelector('.swatch[data-key="grass"]').classList.add('active');

/* -----------------------------------------------------------
   Start / Reload
----------------------------------------------------------- */
btnStart.addEventListener('click', async ()=>{
  await startGame();
});
btnReload.addEventListener('click', ()=>{
  location.replace(bustUrl(location.href)); // harter Bust‑Reload
});

function bustUrl(u){
  const url = new URL(u);
  url.searchParams.set('v', Date.now().toString());
  return url.toString();
}

/* -----------------------------------------------------------
   Haupt‑Startlogik
----------------------------------------------------------- */
async function startGame(){
  const params = getParams();
  const page = bustUrl(location.origin + location.pathname + location.search);
  diag(`page=${page}`);
  boot('Debug‑Overlay aktiv (non‑blocking). F2 toggelt Overlay.');
  fitCanvas();

  initMapSelector(params.map);

  // Lade Map
  boot('preGameInit OK • V14.7‑hf2');
  try{
    const mapUrl = selMap.value || params.map;
    game(`Lade Karte:\n${new URL(mapUrl, location.href).toString()}`);

    world = await loadAndPrepareMap(mapUrl, {
      onNet: (url, code, ms)=> net(`${code} ${url} (${ms}ms)`),
      onAtlas: (k,v)=> atlas(`${k}=${v}`),
      log: (t,m)=> log(t,m),
    });

    game(`Karte geladen: ${new URL(mapUrl, location.href).toString()}`);
    running = true; lastTS = 0;
    requestAnimationFrame(loop);
  } catch(err){
    game(`Karte konnte nicht geladen werden: ${err?.message || err}`);
    running = true; // trotzdem Fallback‑Loop (leeres Grid)
    lastTS = 0;
    requestAnimationFrame(loop);
  }
}

/* -----------------------------------------------------------
   Render‑Loop
----------------------------------------------------------- */
function loop(ts){
  if (!running) return;
  if (lastTS===0) lastTS = ts;
  const dt = ts - lastTS; lastTS = ts;

  // Status HUD oben links
  const dpr = devicePixelRatio||1;
  const size = `${cv.width}×${cv.height}`;
  const mapName = world?.mapUrl ? world.mapUrl.split('/').pop() : '–';
  const assetsState = world ? 'aktiv' : '–';
  statusEl.textContent =
`Frames: ${Math.round(ts/1000*60)%10000}  dt=${dt.toFixed(2)}ms
Cam: x=${camera.x.toFixed(1)}  y=${camera.y.toFixed(1)}  zoom=${camera.zoom.toFixed(2)}
Map: ${mapName.padEnd(6)} /  Assets: ${assetsState}
DPR=${dpr.toFixed(2)}   Size=${size}`;

  // Hintergrund
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#0b1621';
  ctx.fillRect(0,0,cv.width,cv.height);

  // Welt zeichnen
  if (world?.view){
    renderView(cv, world.view, camera);
  } else {
    // Fallback: nur Gitter im Nichts anzeigen (Debug)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x=0; x<cv.width; x+=64) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,cv.height); ctx.stroke(); }
    for (let y=0; y<cv.height;y+=64){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cv.width,y); ctx.stroke(); }
  }

  requestAnimationFrame(loop);
}

/* -----------------------------------------------------------
   Autostart im Debug‑Flow: UI bleibt sichtbar
----------------------------------------------------------- */
addEventListener('load', ()=>{
  // sofort bereit, aber erst nach Klick „Start“ laden
  boot('asset.js: OK');
  boot('map-runtime.js: OK');
  boot('boot.js: OK');
  setDebugVisible(true);
});
