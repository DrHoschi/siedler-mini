// core/render.js – V13 Safe Renderer (kein Offscreen; nur sichtbare Tiles)
import { IM } from './assets.js';
import { cam } from './camera.js';
import { TILE_W, TILE_H, MAP, grid, computeRoadMasks, buildingImage, cellToIso } from './world.js';

let canvas=null, ctx=null;
export function setMainCanvas(c){
  canvas=c; ctx=c.getContext('2d', { alpha:false });
  ctx.imageSmoothingEnabled = true;
}

/* ---------- Draw invalidation ---------- */
let needsDraw = true;
export function requestDraw(){ needsDraw = true; drawIfNeeded(); }
function drawIfNeeded(){ if(!needsDraw) return; needsDraw=false; drawAll(); }

/* ---------- Hilfen ---------- */
function diamondPath(c, x,y,w,h){
  c.beginPath();
  c.moveTo(x + w*0.5, y);
  c.lineTo(x + w,     y + h*0.5);
  c.lineTo(x + w*0.5, y + h);
  c.lineTo(x,         y + h*0.5);
  c.closePath();
}

// Screen‑Rechteck → grobe Zellgrenzen (schnell, großzügig)
function visibleCellRange(){
  const z = cam.z;
  const W = canvas.width  / z;
  const H = canvas.height / z;

  // sichtbarer Weltbereich in „Logik‑Px“
  const left   = cam.x - TILE_W;            // etwas Puffer
  const top    = cam.y - TILE_H;
  const right  = cam.x + W + TILE_W;
  const bottom = cam.y + H + TILE_H;

  // inverse iso: (x - y) * w/2 = X  und  (x + y) * h/2 = Y
  // grob abschätzen über umgeformte Gleichungen:
  const fx = ( (top/(TILE_H/2)) + (right/(TILE_W/2)) )/2;
  const fy = ( (top/(TILE_H/2)) - (left /(TILE_W/2)) )/2;
  const gx = ( (bottom/(TILE_H/2)) + (left /(TILE_W/2)) )/2;
  const gy = ( (bottom/(TILE_H/2)) - (right/(TILE_W/2)) )/2;

  let minX = Math.floor(Math.min(fx,gx)) - 2;
  let maxX = Math.ceil (Math.max(fx,gx)) + 2;
  let minY = Math.floor(Math.min(fy,gy)) - 2;
  let maxY = Math.ceil (Math.max(fy,gy)) + 2;

  minX = Math.max(0, minX); minY = Math.max(0, minY);
  maxX = Math.min(MAP.W-1, maxX); maxY = Math.min(MAP.H-1, maxY);

  return {minX, maxX, minY, maxY};
}

/* ---------- Zeichnen ---------- */
function drawGround(){
  const {minX,maxX,minY,maxY} = visibleCellRange();

  for(let y=minY; y<=maxY; y++){
    for(let x=minX; x<=maxX; x++){
      const p = cellToIso(x,y);
      const rx = p.x - cam.x;
      const ry = p.y - cam.y;

      // Clip auf Rautenform
      ctx.save();
      diamondPath(ctx, rx, ry, TILE_W, TILE_H); ctx.clip();

      const t  = grid[y][x].ground;
      const img= t==='water' ? IM.water : (t==='shore' ? IM.shore : IM.grass);
      if(img) ctx.drawImage(img, rx-1, ry-1, TILE_W+2, TILE_H+2);
      else {
        ctx.fillStyle = t==='water' ? '#10324a' : (t==='shore' ? '#244822' : '#2a3e1f');
        ctx.fillRect(rx, ry, TILE_W, TILE_H);
      }
      ctx.restore();
      // Optionales zartes Netz:
      // ctx.strokeStyle = 'rgba(255,255,255,.03)'; ctx.strokeRect(rx,ry,TILE_W,TILE_H);
    }
  }
}

function pickRoadTexture(mask){
  const opp = (mask===0b0101 || mask===0b1010); // N+S oder E+W
  return opp ? (IM.road_straight || IM.road_curve)
             : (IM.road_curve   || IM.road_straight);
}
function drawRoads(){
  computeRoadMasks();
  const {minX,maxX,minY,maxY} = visibleCellRange();

  for(let y=minY; y<=maxY; y++){
    for(let x=minX; x<=maxX; x++){
      if(!grid[y][x].road) continue;
      const p = cellToIso(x,y);
      const rx = p.x - cam.x, ry = p.y - cam.y;

      ctx.save();
      diamondPath(ctx, rx, ry, TILE_W, TILE_H); ctx.clip();

      const tex = pickRoadTexture(grid[y][x].roadMask);
      if(tex) ctx.drawImage(tex, rx-1, ry-1, TILE_W+2, TILE_H+2);
      else { ctx.fillStyle='#6b6f7a';
             ctx.fillRect(rx+TILE_W*.18, ry+TILE_H*.36, TILE_W*.64, TILE_H*.28); }

      ctx.restore();
    }
  }
}

function drawBuildings(){
  const {minX,maxX,minY,maxY} = visibleCellRange();

  for(let y=minY; y<=maxY; y++){
    for(let x=minX; x<=maxX; x++){
      const b = grid[y][x].building; if(!b) continue;
      const p = cellToIso(x,y);
      const rx = p.x - cam.x, ry = p.y - cam.y;

      const img = buildingImage(b);
      if(img){
        const w = TILE_W*1.05;
        const h = img.height*(w/img.width);
        ctx.drawImage(img, rx+TILE_W/2-w/2, ry+TILE_H - h + TILE_H*0.10, w, h);
      }else{
        ctx.fillStyle = b==='hq' ? '#6a4' : (b==='depot' ? '#bfa' : '#4aa45a');
        ctx.fillRect(rx+TILE_W*.12, ry+TILE_H*.12, TILE_W*.76, TILE_H*.76);
      }
    }
  }
}

export function drawAll(){
  if(!canvas) return;

  // Voller Reset
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0, canvas.width, canvas.height);

  // Zoom anwenden
  ctx.save();
  const z = cam.z;
  ctx.scale(z, z);

  // Hintergrund (falls keine Tiles sichtbar sind)
  ctx.fillStyle = '#20361b';
  ctx.fillRect(0,0, canvas.width/z, canvas.height/z);

  // Sichtbare Tiles direkt zeichnen
  drawGround();
  drawRoads();
  drawBuildings();

  ctx.restore();
}
