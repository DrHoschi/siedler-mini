// core/render.js – V13.2 Mobile (safe padded ground with max size clamp)
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

/* ---------- Offscreen-Boden ---------- */
let groundLayer=null, gtx=null, gW=0, gH=0, PAD=0;
let lastBuild = { z:null, vw:0, vh:0, pad:0 };

// harte Obergrenze für Offscreen-Texturen (iOS/Safari sicher)
const MAX_OFFSCREEN = 8192; // px

export function prerenderGround(){
  if(!canvas) return;

  const mapW = MAP.W * TILE_W;
  const mapH = MAP.H * TILE_H;

  // Viewport in Logikpx (DPR/Zoom)
  const dpr = window.devicePixelRatio || 1;
  const vw  = (window.innerWidth  * dpr) / Math.max(cam.z, 0.001);
  const vh  = (window.innerHeight * dpr) / Math.max(cam.z, 0.001);

  // gewünschtes großzügiges Padding
  const desiredPAD = Math.ceil(Math.hypot(vw, vh) * 1.5) + Math.max(TILE_W, TILE_H) * 6;

  // maximale PADs, damit Offscreen <= MAX_OFFSCREEN bleibt
  const maxPadX = Math.max(0, Math.floor((MAX_OFFSCREEN - mapW) / 2));
  const maxPadY = Math.max(0, Math.floor((MAX_OFFSCREEN - mapH) / 2));

  PAD = Math.max(0, Math.min(desiredPAD, maxPadX, maxPadY));

  gW = mapW + PAD*2;
  gH = mapH + PAD*2;

  // falls Map selbst schon größer als MAX_OFFSCREEN (hier nicht der Fall), clampen:
  if (gW > MAX_OFFSCREEN || gH > MAX_OFFSCREEN) {
    // letzter Notanker: kein PAD (direkt Mapgröße)
    PAD = 0;
    gW = mapW;
    gH = mapH;
  }

  groundLayer = document.createElement('canvas');
  groundLayer.width  = gW;
  groundLayer.height = gH;
  gtx = groundLayer.getContext('2d', { alpha:false });
  gtx.imageSmoothingEnabled = true;

  // Randfläche füllen (Grasbasis)
  gtx.fillStyle = '#20361b';
  gtx.fillRect(0,0,gW,gH);

  // Map-Raute zeichnen (um PAD verschoben)
  for(let y=0;y<MAP.H;y++){
    for(let x=0;x<MAP.W;x++){
      const p=cellToIso(x,y);
      const r={ x:p.x + PAD, y:p.y + PAD, w:TILE_W, h:TILE_H };

      gtx.save();
      diamondPath(gtx, r.x,r.y,r.w,r.h); gtx.clip();

      const t  = grid[y][x].ground;
      const img= t==='water' ? IM.water : (t==='shore' ? IM.shore : IM.grass);
      if(img) gtx.drawImage(img, r.x-1, r.y-1, r.w+2, r.h+2);
      else { gtx.fillStyle = t==='water' ? '#10324a' : (t==='shore' ? '#244822' : '#2a3e1f');
             gtx.fillRect(r.x,r.y,r.w,r.h); }

      gtx.restore();
    }
  }

  lastBuild = { z:cam.z, vw:window.innerWidth, vh:window.innerHeight, pad:PAD };
}

function diamondPath(c, x,y,w,h){
  c.beginPath();
  c.moveTo(x + w*0.5, y);
  c.lineTo(x + w,     y + h*0.5);
  c.lineTo(x + w*0.5, y + h);
  c.lineTo(x,         y + h*0.5);
  c.closePath();
}

/* ---------- Roads / Buildings ---------- */
function pickRoadTexture(mask){
  const opp = (mask===0b0101 || mask===0b1010); // N+S oder E+W
  return opp ? (IM.road_straight || IM.road_curve)
             : (IM.road_curve   || IM.road_straight);
}

function drawRoads(){
  computeRoadMasks();
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    if(!grid[y][x].road) continue;
    const p=cellToIso(x,y);
    const r={ x:p.x - cam.x, y:p.y - cam.y, w:TILE_W, h:TILE_H };

    ctx.save();
    diamondPath(ctx, r.x,r.y,r.w,r.h); ctx.clip();

    const tex=pickRoadTexture(grid[y][x].roadMask);
    if(tex) ctx.drawImage(tex, r.x-1, r.y-1, r.w+2, r.h+2);
    else { ctx.fillStyle='#6b6f7a';
           ctx.fillRect(r.x+r.w*.18, r.y+r.h*.36, r.w*.64, r.h*.28); }

    ctx.restore();
  }
}

function drawBuildings(){
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    const b=grid[y][x].building; if(!b) continue;
    const p=cellToIso(x,y);
    const r={ x:p.x - cam.x, y:p.y - cam.y, w:TILE_W, h:TILE_H };
    const img=buildingImage(b);

    if(img){
      const w=r.w*1.05, h=img.height*(w/img.width);
      ctx.drawImage(img, r.x+r.w/2-w/2, r.y+r.h - h + r.h*0.10, w, h);
    }else{
      ctx.fillStyle = b==='hq' ? '#6a4' : (b==='depot' ? '#bfa' : '#4aa45a');
      ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76);
    }
  }
}

/* ---------- Auto-Rebuild-Checks ---------- */
function maybeRebuild(){
  if(!groundLayer) return true;

  // Zoom/Viewport geändert?
  const zoomChanged = (lastBuild.z==null) || (Math.abs(cam.z - lastBuild.z) / (lastBuild.z||1) > 0.10);
  const vpChanged   = (window.innerWidth !== lastBuild.vw || window.innerHeight !== lastBuild.vh);
  if(zoomChanged || vpChanged) return true;

  // Sichtfenster zu nah am Offscreen-Rand?
  const dpr = window.devicePixelRatio || 1;
  const vw  = (window.innerWidth  * dpr) / Math.max(cam.z, 0.001);
  const vh  = (window.innerHeight * dpr) / Math.max(cam.z, 0.001);

  const left   = cam.x + lastBuild.pad;
  const top    = cam.y + lastBuild.pad;
  const right  = left + vw;
  const bottom = top  + vh;

  const margin = Math.max(64, lastBuild.pad * 0.15); // min. 64px Sicherheit
  if (left   < margin)           return true;
  if (top    < margin)           return true;
  if (right  > gW - margin)      return true;
  if (bottom > gH - margin)      return true;

  return false;
}

/* ---------- Haupt-Draw ---------- */
export function drawAll(){
  if(!canvas) return;

  if(maybeRebuild()) prerenderGround();

  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.save();
  const z = cam.z;
  ctx.scale(z,z);

  // Hintergrund passend zum Offscreen-Rand
  ctx.fillStyle = '#20361b';
  ctx.fillRect(0,0, canvas.width/z, canvas.height/z);

  if(groundLayer){
    ctx.drawImage(groundLayer, -cam.x - PAD, -cam.y - PAD);
  }

  drawRoads();
  drawBuildings();

  ctx.restore();
}
