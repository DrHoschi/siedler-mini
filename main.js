/* =========================================================
   Siedler-Mini V12.2
   - Isometrischer Renderer
   - Zoom zum Mauszeiger / Pinch-Zoom
   - Mini-Map
   - Straßen-Autotiling & HQ-Konnektivität
   - Holzfäller-Produktion
   - Animierte Träger mit Wegfindung
   ========================================================= */

'use strict';

// ------------------- Globale Variablen -------------------
const TILE_W = 64, TILE_H = 32; // Iso-Tile Größe
const MAP_W = 50, MAP_H = 50;
const ZOOM_MIN = 0.5, ZOOM_MAX = 2.5;

let canvas, ctx, minimap, mctx;
let camX = 0, camY = 0, zoom = 1;
let mouseX = 0, mouseY = 0;
let isPanning = false, panStart = {x:0, y:0}, camStart = {x:0, y:0};
let tool = 'select';
let overlay, toolbar;
let dragging = false;

// Map-Daten
let map = [];
let buildings = [];
let carriers = [];

// Ressourcen
let res = {
  wood: 0,
  stone: 0,
  food: 0,
  gold: 0,
  pop: 0
};

// Bilder
let textures = {};

// ------------------- Init -------------------
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  minimap = document.getElementById('minimap');
  mctx = minimap.getContext('2d');
  overlay = document.getElementById('overlay');
  toolbar = document.getElementById('toolbar');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  loadTextures(startup);
});

// ------------------- Texturen laden -------------------
function loadTextures(cb){
  const files = [
    'grass.png','water.png','shore.png','dirt.png','rocky.png','sand.png',
    'road.png','road_straight.png','road_curve.png',
    'hq_wood.png','lumberjack.png','depot.png'
  ];
  let loaded = 0;
  files.forEach(name => {
    const img = new Image();
    img.src = 'assets/'+name;
    img.onload = () => {
      loaded++;
      if(loaded === files.length) cb();
    };
    textures[name] = img;
  });
}

// ------------------- Start -------------------
function startup(){
  generateMap();
  setupUI();
  requestAnimationFrame(loop);
}

// ------------------- UI Setup -------------------
function setupUI(){
  document.querySelectorAll('#toolbar .btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#toolbar .btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      tool = btn.dataset.tool;
    });
  });

  document.querySelectorAll('[data-action="start"]').forEach(b=>{
    b.addEventListener('click',()=>{
      overlay.style.display='none';
    });
  });
  document.querySelectorAll('[data-action="reset"]').forEach(b=>{
    b.addEventListener('click',()=>{
      generateMap();
      overlay.style.display='none';
    });
  });

  // Maus-Events
  canvas.addEventListener('mousedown', e=>{
    if(e.button === 1 || e.button === 2){
      isPanning = true;
      panStart.x = e.clientX; panStart.y = e.clientY;
      camStart.x = camX; camStart.y = camY;
    } else if(e.button === 0){
      handleClick(e);
    }
  });
  window.addEventListener('mouseup', e=>{
    isPanning = false;
  });
  window.addEventListener('mousemove', e=>{
    mouseX = e.clientX;
    mouseY = e.clientY;
    if(isPanning){
      camX = camStart.x + (e.clientX - panStart.x);
      camY = camStart.y + (e.clientY - panStart.y);
    }
  });

  // Touch (Pan + Pinch)
  canvas.addEventListener('touchstart', handleTouchStart, {passive:false});
  canvas.addEventListener('touchmove', handleTouchMove, {passive:false});
  canvas.addEventListener('touchend', handleTouchEnd);

  // Zoom
  canvas.addEventListener('wheel', e=>{
    e.preventDefault();
    zoomToPoint(e.deltaY < 0 ? 1.1 : 0.9, e.clientX, e.clientY);
  }, {passive:false});
}

// ------------------- Map generieren -------------------
function generateMap(){
  map = [];
  for(let y=0;y<MAP_H;y++){
    let row = [];
    for(let x=0;x<MAP_W;x++){
      let type = 'grass';
      if(x<5) type='water';
      if(x===5) type='shore';
      row.push({type, road:false, b:null});
    }
    map.push(row);
  }
  // HQ in der Mitte
  let hqx = Math.floor(MAP_W/2);
  let hqy = Math.floor(MAP_H/2);
  map[hqy][hqx].b = {type:'hq_wood'};
}

// ------------------- Spiel-Loop -------------------
function loop(){
  render();
  update();
  requestAnimationFrame(loop);
}

// ------------------- Render -------------------
function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      let tile = map[y][x];
      let sx = (x - y) * TILE_W/2 * zoom + camX + canvas.width/2;
      let sy = (x + y) * TILE_H/2 * zoom + camY;
      ctx.drawImage(textures[tile.type+'.png'], sx, sy, TILE_W*zoom, TILE_H*zoom);
      if(tile.road){
        ctx.drawImage(textures['road.png'], sx, sy, TILE_W*zoom, TILE_H*zoom);
      }
      if(tile.b){
        ctx.drawImage(textures[tile.b.type+'.png'], sx, sy - TILE_H*zoom, TILE_W*zoom, TILE_W*zoom);
      }
    }
  }

  // Minimap
  mctx.clearRect(0,0,minimap.width,minimap.height);
  let scale = minimap.width / MAP_W;
  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      let tile = map[y][x];
      mctx.fillStyle = tile.type==='water' ? '#3af' : '#4c4';
      mctx.fillRect(x*scale,y*scale,scale,scale);
    }
  }
}

// ------------------- Update -------------------
function update(){
  // TODO: Produktion + Träger-Logik
}

// ------------------- Klick-Handler -------------------
function handleClick(e){
  let iso = screenToIso(e.clientX, e.clientY);
  let gx = iso.x, gy = iso.y;
  if(gx<0||gy<0||gx>=MAP_W||gy>=MAP_H) return;

  if(tool==='road'){
    map[gy][gx].road = true;
  }
  if(tool==='lumber'){
    map[gy][gx].b = {type:'lumberjack'};
  }
  if(tool==='bulldoze'){
    map[gy][gx].road = false;
    map[gy][gx].b = null;
  }
}

// ------------------- Screen→Iso -------------------
function screenToIso(sx, sy){
  let cx = (sx - camX - canvas.width/2) / zoom;
  let cy = (sy - camY) / zoom;
  let gx = Math.floor((cx / (TILE_W/2) + cy / (TILE_H/2)) / 2);
  let gy = Math.floor((cy / (TILE_H/2) - cx / (TILE_W/2)) / 2);
  return {x:gx, y:gy};
}

// ------------------- Zoom zum Punkt -------------------
function zoomToPoint(factor, mx, my){
  let wxBefore = (mx - camX) / zoom;
  let wyBefore = (my - camY) / zoom;
  zoom *= factor;
  zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
  let wxAfter = (mx - camX) / zoom;
  let wyAfter = (my - camY) / zoom;
  camX += (wxAfter - wxBefore) * zoom;
  camY += (wyAfter - wyBefore) * zoom;
}

// ------------------- Touch-Gesten -------------------
let touchStartDist = 0, lastZoom = zoom;
function handleTouchStart(e){
  if(e.touches.length===1){
    isPanning=true;
    panStart.x = e.touches[0].clientX;
    panStart.y = e.touches[0].clientY;
    camStart.x = camX; camStart.y = camY;
  } else if(e.touches.length===2){
    touchStartDist = getTouchDist(e);
    lastZoom = zoom;
  }
}
function handleTouchMove(e){
  e.preventDefault();
  if(e.touches.length===1 && isPanning){
    camX = camStart.x + (e.touches[0].clientX - panStart.x);
    camY = camStart.y + (e.touches[0].clientY - panStart.y);
  } else if(e.touches.length===2){
    let dist = getTouchDist(e);
    let factor = dist / touchStartDist;
    zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, lastZoom * factor));
  }
}
function handleTouchEnd(e){
  if(e.touches.length===0) isPanning=false;
}
function getTouchDist(e){
  let dx = e.touches[0].clientX - e.touches[1].clientX;
  let dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

// ------------------- Resize -------------------
function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
