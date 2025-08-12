// Siedler‑Mini V13.7 – Mobile start fix + fullscreen + korrekte Karte
// Lädt render.js dynamisch und initialisiert Welt/Events.

import { createRenderer } from './render.js';

// --- DOM ----
const cvs = document.getElementById('game');
const overlay = document.getElementById('overlay');
const btnStart = document.getElementById('start');
const btnFull = document.getElementById('btnFull');
const btnCenter = document.getElementById('btnCenter');
const btnDebug = document.getElementById('btnDebug');

const toolName = document.getElementById('toolName');
const zoomLabel = document.getElementById('zoomLabel');

const btnCursor  = document.getElementById('toolCursor');
const btnRoad    = document.getElementById('toolRoad');
const btnHQ      = document.getElementById('toolHQ');
const btnLumber  = document.getElementById('toolLumber');
const btnDepot   = document.getElementById('toolDepot');
const btnBulldo  = document.getElementById('toolBulldo');

// --- Spielzustand klein & robust ---
const State = {
  started:false,
  tool:'cursor',                 // cursor|road|hq|lumber|depot|bulldo
  zoom:1,
  debug:false,
  world:null,
  r:null,                        // renderer
  pointer:{x:0,y:0,down:false},
};

// --- einfache Welt (feste Größe, HQ in Mitte) ---
function makeWorld(){
  const W = 120, H = 120;                 // feste Karte
  const tiles = new Array(W*H).fill(0);   // 0=gras
  // kleiner See unten rechts als Sicht-Anker
  for (let y=80;y<96;y++){
    for (let x=80;x<110;x++){
      tiles[y*W+x] = (x===80||y===80||x===109||y===95) ? 2 : 1; // 2=shore, 1=water
    }
  }
  // HQ an Kartenmitte
  const cx = (W/2)|0, cy = (H/2)|0;
  const buildings = [{ kind:'hq_stone', x:cx, y:cy }];

  // Straßengraph / Belegung separat
  const roads = new Set();     // key `${x},${y}`
  const blocked = new Set();   // für Gebäude-Footprints

  // Fußabdruck HQ (3x3) blocken
  for (let dy=-1; dy<=1; dy++){
    for (let dx=-1; dx<=1; dx++){
      blocked.add(`${cx+dx},${cy+dy}`);
    }
  }

  return { W,H, tiles, roads, buildings, blocked };
}

// Hilfsfunktionen
const key = (x,y)=>`${x},${y}`;
const inBounds = (w,x,y)=> x>=0 && y>=0 && x<w.W && y<w.H;

// --- Tool-UI sync ---
function setTool(name){
  State.tool = name;
  toolName.textContent = name==='cursor' ? 'Zeiger'
    : name==='road' ? 'Straße'
    : name==='hq' ? 'HQ'
    : name==='lumber' ? 'Holzfäller'
    : name==='depot' ? 'Depot'
    : 'Abriss';
}

// --- Bauen / Abreißen ---
function canPlaceBuilding(world, kind, gx,gy){
  // footprints
  let fp = [{x:0,y:0}];
  if (kind==='hq' || kind==='hq_stone') {
    fp = [];
    for (let dy=-1; dy<=1; dy++)
      for (let dx=-1; dx<=1; dx++)
        fp.push({x:dx,y:dy});
  } else if (kind==='lumber' || kind==='depot'){
    fp = [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}];
  }
  for (const o of fp){
    const x = gx+o.x, y = gy+o.y;
    if (!inBounds(world,x,y) || world.blocked.has(key(x,y))) return false;
  }
  return true;
}
function placeBuilding(world, kind, gx,gy){
  const k = (kind==='hq')?'hq_wood':(kind==='hq_stone'? 'hq_stone': kind);
  if (!canPlaceBuilding(world,k,gx,gy)) return false;
  world.buildings.push({kind:k,x:gx,y:gy});
  // blockieren
  if (k==='hq_stone' || k==='hq_wood'){
    for (let dy=-1; dy<=1; dy++)
      for (let dx=-1; dx<=1; dx++)
        world.blocked.add(key(gx+dx,gy+dy));
  } else if (k==='lumber' || k==='depot'){
    for (let dy=0; dy<=1; dy++)
      for (let dx=0; dx<=1; dx++)
        world.blocked.add(key(gx+dx,gy+dy));
  } else {
    world.blocked.add(key(gx,gy));
  }
  return true;
}
function toggleRoad(world, gx,gy){
  const k = key(gx,gy);
  if (!inBounds(world,gx,gy) || world.blocked.has(k)) return;
  if (world.roads.has(k)) world.roads.delete(k);
  else world.roads.add(k);
}

// --- Startlogik / Overlay ---
btnStart.addEventListener('click', async ()=>{
  await startGame();
});
btnFull.addEventListener('click', async ()=>{
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch(_) {}
});

async function startGame(){
  if (State.started) return;
  // Renderer erzeugen (lädt Texturen, setzt Kamera usw.)
  State.world = makeWorld();
  State.r = await createRenderer(cvs, State.world, {
    onZoom:(z)=>{ State.zoom=z; zoomLabel.textContent=`Zoom ${z.toFixed(2)}x`; },
    debugGetter:()=>State.debug
  });
  // Kamera auf HQ
  const hq = State.world.buildings.find(b=>b.kind.startsWith('hq'));
  if (hq) State.r.centerOn(hq.x, hq.y, 1.0);

  overlay.style.display='none';
  State.started = true;
  setTool('cursor');
  State.r.requestFrame();
}

// --- Debug / Center UI ---
btnCenter.addEventListener('click', ()=>{
  if (!State.r || !State.world) return;
  const hq = State.world.buildings.find(b=>b.kind.startsWith('hq'));
  if (hq) State.r.centerOn(hq.x, hq.y, State.r.zoom);
});
btnDebug.addEventListener('click', ()=>{
  State.debug = !State.debug;
  btnDebug.textContent = State.debug ? 'Debug ✓' : 'Debug';
  if (State.r) State.r.requestFrame();
});

// --- Tool Buttons ---
btnCursor .addEventListener('click', ()=>setTool('cursor'));
btnRoad   .addEventListener('click', ()=>setTool('road'));
btnHQ     .addEventListener('click', ()=>setTool('hq'));
btnLumber .addEventListener('click', ()=>setTool('lumber'));
btnDepot  .addEventListener('click', ()=>setTool('depot'));
btnBulldo .addEventListener('click', ()=>setTool('bulldo'));

// --- Eingaben (Touch+Maus) ---
// Pan nur im Zeiger-Tool, Bauen per kurzer Tap/Klick in Bau-Tools
let drag=false, last={x:0,y:0};
cvs.addEventListener('pointerdown', (e)=>{
  if (!State.started) return;
  cvs.setPointerCapture(e.pointerId);
  State.pointer.down=true;
  last.x=e.clientX; last.y=e.clientY;

  if (State.tool!=='cursor'){
    // bauen/abreißen
    const {gx,gy} = State.r.screenToGrid(e.clientX, e.clientY);
    if (State.tool==='road')       toggleRoad(State.world, gx,gy);
    else if (State.tool==='bulldo'){ // Abriss: Gebäude oder Straße
      const k = key(gx,gy);
      State.world.roads.delete(k);
      // Gebäude entfernen, wenn footprint enthält die Zelle
      const b = State.world.buildings.findIndex(b=>containsFoot(b,gx,gy));
      if (b>=0){
        unBlock(State.world, State.world.buildings[b]);
        State.world.buildings.splice(b,1);
      }
    }
    else if (State.tool==='hq' || State.tool==='lumber' || State.tool==='depot'){
      const placed = placeBuilding(State.world, State.tool, gx,gy);
      if (!placed) flashBtn(btnHQ);
    }
    State.r.requestFrame();
  } else {
    drag=true;
  }
});
cvs.addEventListener('pointermove', (e)=>{
  if (!State.started) return;
  if (drag && State.tool==='cursor'){
    const dx = e.clientX-last.x, dy = e.clientY-last.y;
    last.x=e.clientX; last.y=e.clientY;
    State.r.panPixels(dx,dy);
  }
});
cvs.addEventListener('pointerup', ()=>{
  State.pointer.down=false;
  drag=false;
});

// Pinch‑Zoom (2 Finger)
let pinchIdA=null, pinchIdB=null, pinchStartDist=0, pinchStartZoom=1;
cvs.addEventListener('pointerdown', (e)=>{
  if (pinchIdA===null) pinchIdA=e.pointerId;
  else if (pinchIdB===null && e.pointerId!==pinchIdA) {
    pinchIdB=e.pointerId;
    pinchStartDist = distOfPointers();
    pinchStartZoom = State.r.zoom;
  }
});
cvs.addEventListener('pointerup', (e)=>{
  if (e.pointerId===pinchIdA) pinchIdA=null;
  if (e.pointerId===pinchIdB) pinchIdB=null;
});
cvs.addEventListener('pointermove', (e)=>{
  if (pinchIdA && pinchIdB){
    const d = distOfPointers();
    if (d>0){
      const scale = d/pinchStartDist;
      State.r.setZoomClamped(pinchStartZoom*scale, e.clientX, e.clientY);
    }
  }
});
function distOfPointers(){
  const pA = getPointerById(pinchIdA);
  const pB = getPointerById(pinchIdB);
  return (pA && pB) ? Math.hypot(pA.clientX-pB.clientX, pA.clientY-pB.clientY) : 0;
}
function getPointerById(id){
  // Safari hat keine Pointer Events Liste -> wir nutzen last event position
  // Workaround: read from document’s last known positions (keine API),
  // deshalb geben wir null zurück falls nicht verfügbar.
  return [...document.querySelectorAll(':pointer')].find(p=>p.pointerId===id) || null;
}

// Maus-Zoom (Desktop)
cvs.addEventListener('wheel',(e)=>{
  if (!State.started) return;
  e.preventDefault();
  const dir = Math.sign(e.deltaY);
  const f = dir>0 ? 0.9 : 1.1;
  State.r.setZoomClamped(State.r.zoom*f, e.clientX, e.clientY);
},{passive:false});

// Kleine Helfer
function flashBtn(el){
  el.animate([{boxShadow:'0 0 0 0 rgba(239,68,68,.8)'},
              {boxShadow:'0 0 0 6px rgba(239,68,68,0)'}],
             {duration:400});
}
function containsFoot(b,gx,gy){
  if (b.kind.startsWith('hq')){
    return Math.abs(gx-b.x)<=1 && Math.abs(gy-b.y)<=1;
  }
  if (b.kind==='lumber' || b.kind==='depot'){
    return gx>=b.x && gx<=b.x+1 && gy>=b.y && gy<=b.y+1;
  }
  return gx===b.x && gy===b.y;
}
function unBlock(world, b){
  if (b.kind.startsWith('hq')){
    for (let dy=-1; dy<=1; dy++)
      for (let dx=-1; dx<=1; dx++)
        world.blocked.delete(key(b.x+dx,b.y+dy));
  } else if (b.kind==='lumber' || b.kind==='depot'){
    for (let dy=0; dy<=1; dy++)
      for (let dx=0; dx<=1; dx++)
        world.blocked.delete(key(b.x+dx,b.y+dy));
  } else {
    world.blocked.delete(key(b.x,b.y));
  }
}
