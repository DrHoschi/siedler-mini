// main.js – V13.7.2 – Startet mit zentriertem HQ + funktionierendem Pan/Zoom/Bauen
import { IsoRenderer } from './render.js';

// ---- Asset-Loader (deine Namen aus /assets)
const IM = {};
const LIST = [
  ['grass','assets/grass.png'],
  ['water','assets/water.png'],
  ['shore','assets/shore.png'],
  ['dirt','assets/dirt.png'],
  ['rocky','assets/rocky.png'],
  ['sand','assets/sand.png'],
  ['road','assets/road.png'],               // neutrales Straßen-Tile (Platzhalter)
  ['road_curve','assets/road_curve.png'],   // optional
  ['road_straight','assets/road_straight.png'],
  ['hq_stone','assets/hq_stone.png'],
  ['hq_wood','assets/hq_wood.png'],
  ['lumber','assets/lumberjack.png'],
  ['depot','assets/depot.png'],
  ['carrier','assets/carrier.png'],         // (Sprite-Sheet 4x2 o.ä., Platzhalter ok)
];

function loadAssets(){
  return Promise.all(LIST.map(([k,src]) => new Promise(res=>{
    const im = new Image(); im.onload=()=>{IM[k]=im;res();};
    im.onerror=()=>{console.warn('Fehlt:',src); IM[k]=null; res();};
    im.src = src;
  })));
}

// ---- Welt-Daten
const WORLD_W = 160;   // Spalten
const WORLD_H = 120;   // Reihen
const TILES = new Array(WORLD_W*WORLD_H).fill(0); // 0=Grass, 1=Water, 2=Shore, 3=Dirt, 4=Rocky, 5=Sand
const ROADS = new Set();     // Schlüssel "i,j"
const BUILD = [];            // {type:'hq'|'lumber'|'depot', i,j, img}

// kleine Demo-Map mit See
function genWorld(){
  for(let j=0;j<WORLD_H;j++){
    for(let i=0;i<WORLD_W;i++){
      TILES[i+j*WORLD_W] = 0; // grass
    }
  }
  // See in der Mitte-oben
  const cx=WORLD_W*0.6, cy=WORLD_H*0.25, R=12;
  for(let j=0;j<WORLD_H;j++){
    for(let i=0;i<WORLD_W;i++){
      const d = Math.hypot(i-cx, j-cy);
      if(d<R) TILES[i+j*WORLD_W] = 1; // water
      else if (d<R+1 && TILES[i+j*WORLD_W]===0) TILES[i+j*WORLD_W]=2; // shore
    }
  }
}

// ---- Hilfen
const key = (i,j)=> `${i},${j}`;
const inBounds = (i,j)=> (i>=0 && j>=0 && i<WORLD_W && j<WORLD_H);

// ---- Kamera & Renderer
const canvas = document.getElementById('game');
const r = new IsoRenderer(canvas, { tileW:128, tileH:64, zoom:1, bg:'#0b1220' });

// ---- UI
const ui = {
  start: document.getElementById('start'),
  overlay: document.getElementById('overlay'),
  btnFull: document.getElementById('btnFull'),
  debug: document.getElementById('btnDebug'),
  zoomLabel: document.getElementById('zoomLabel'),
  btnCenter: document.getElementById('btnCenter'),
  toolBtns: {
    cursor: document.getElementById('toolCursor'),
    road:   document.getElementById('toolRoad'),
    hq:     document.getElementById('toolHQ'),
    lumber: document.getElementById('toolLumber'),
    depot:  document.getElementById('toolDepot'),
    bulldo: document.getElementById('toolBulldo'),
  }
};

let DEBUG=false;
let tool='cursor';
let running=false;
let startHQ = { i: (WORLD_W/2|0), j: (WORLD_H/2|0) };

// ---- Gesten (Mobile‑freundlich)
let dragging=false;
let last1=null;
let pinchStart=null;

function setTool(t){
  tool=t;
  document.getElementById('toolName').textContent = 
    t==='cursor'?'Zeiger': t==='road'?'Straße': t==='hq'?'HQ': t==='lumber'?'Holzfäller': t==='depot'?'Depot':'Abriss';
}

function centerOnHQ(){
  r.setCameraCenter(startHQ.i, startHQ.j);
}

function onStart(){
  ui.overlay.style.display='none';
  running=true;
  centerOnHQ(); // <<— **hier ist die Karte ab Start garantiert sichtbar**
}

// Touch/Pan/Pinch
canvas.addEventListener('touchstart', (e)=>{
  if(!running) return;
  if(e.touches.length===1){
    dragging=true;
    last1 = { x:e.touches[0].clientX, y:e.touches[0].clientY };
  }else if(e.touches.length===2){
    dragging=false;
    const [a,b]=e.touches;
    pinchStart = {
      d: Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY),
      z: r.Z,
      pivot: { x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2 }
    };
  }
},{passive:true});

canvas.addEventListener('touchmove', (e)=>{
  if(!running) return;
  if(e.touches.length===1 && dragging && tool==='cursor'){
    const t=e.touches[0];
    const dx = (t.clientX - last1.x) / (r.TW*0.5*r.Z);
    const dy = (t.clientY - last1.y) / (r.TH*0.5*r.Z);
    r.nudgeCamera(-dx, -dy);
    last1 = { x:t.clientX, y:t.clientY };
  }else if(e.touches.length===2 && pinchStart){
    const [a,b]=e.touches;
    const d = Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
    const z = pinchStart.z * (d / pinchStart.d);
    r.setZoom(z, pinchStart.pivot);
  }
},{passive:true});

canvas.addEventListener('touchend', ()=>{
  dragging=false; pinchStart=null; last1=null;
},{passive:true});

// Kurzer Tap = bauen (wenn Bau-Tool)
canvas.addEventListener('click', (e)=>{
  if(!running) return;
  if(tool==='cursor') return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const w = r.screenToWorld(px, py);
  const i = Math.round(w.x);
  const j = Math.round(w.y);
  if(!inBounds(i,j)) return;

  if(tool==='road'){
    ROADS.add(key(i,j));
  }else if(tool==='hq'){
    BUILD.push({type:'hq', i, j, img: IM.hq_wood ?? null});
  }else if(tool==='lumber'){
    BUILD.push({type:'lumber', i, j, img: IM.lumber ?? null});
  }else if(tool==='depot'){
    BUILD.push({type:'depot', i, j, img: IM.depot ?? null});
  }else if(tool==='bulldo'){
    ROADS.delete(key(i,j));
    // Gebäude wegräumen:
    for(let k=BUILD.length-1;k>=0;k--){
      if(BUILD[k].i===i && BUILD[k].j===j){ BUILD.splice(k,1); }
    }
  }
});

// Mausrad (Desktop) – zoom zum Mauszeiger
canvas.addEventListener('wheel', (e)=>{
  if(!running) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const dz = Math.exp((-e.deltaY/200));
  r.setZoom(r.Z*dz, {x:px,y:py});
},{passive:false});

// ---- UI Events
ui.start.addEventListener('click', onStart);
ui.btnFull?.addEventListener('click', ()=>{
  if(!document.fullscreenElement) canvas.requestFullscreen().catch(()=>{});
  else document.exitFullscreen().catch(()=>{});
});
ui.debug?.addEventListener('click', ()=>{ DEBUG=!DEBUG; });
ui.btnCenter?.addEventListener('click', centerOnHQ);

Object.entries(ui.toolBtns).forEach(([k,btn])=>{
  btn?.addEventListener('click', ()=> setTool(
    k==='cursor'?'cursor': k==='road'?'road': k==='hq'?'hq': k==='lumber'?'lumber': k==='depot'?'depot':'bulldo'
  ));
});

// ---- Zeichnen
function draw(){
  r.clear();

  if(!running){
    // Splash zeigt r.clear(); Overlay regelt der DOM
    requestAnimationFrame(draw);
    return;
  }

  const vis = r.getVisibleWorldBounds(3);

  // Hintergrund‑Tiles
  for(let j=vis.minJ;j<=vis.maxJ;j++){
    for(let i=vis.minI;i<=vis.maxI;i++){
      if(!inBounds(i,j)) continue;
      const t = TILES[i+j*WORLD_W];
      let img = null;
      if(t===0) img=IM.grass; else if(t===1) img=IM.water;
      else if(t===2) img=IM.shore; else if(t===3) img=IM.dirt;
      else if(t===4) img=IM.rocky; else if(t===5) img=IM.sand;
      if(img) r.drawTileImage(img, i, j);
    }
  }

  // Straßen
  for(const k of ROADS){
    const [si,sj] = k.split(',').map(n=>parseInt(n,10));
    r.drawTileImage(IM.road ?? IM.dirt, si, sj);
  }

  // Gebäude
  for(const b of BUILD){
    const im = b.img ?? IM.hq_wood ?? IM.dirt;
    r.drawTileImage(im, b.i, b.j);
  }

  // Start-HQ (Stein) – fest in der Mitte
  r.drawTileImage(IM.hq_stone ?? IM.dirt, startHQ.i, startHQ.j);

  // Debug HUD
  if(DEBUG){
    r.drawDebug([
      `cam=(${r.cx.toFixed(2)}, ${r.cy.toFixed(2)})`,
      `zoom=${r.Z.toFixed(2)}`,
      `tiles=${WORLD_W}x${WORLD_H}`
    ]);
    // r.drawGrid(vis);
  }

  ui.zoomLabel && (ui.zoomLabel.textContent = `Zoom ${r.Z.toFixed(2)}x`);
  requestAnimationFrame(draw);
}

// ---- Boot
(async function boot(){
  await loadAssets();
  genWorld();
  setTool('cursor');
  // Start-HQ landet mittig (bereits oben gesetzt)
  requestAnimationFrame(draw);
})();
