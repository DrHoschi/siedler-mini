// core/render.js – V13 Mobile (bordered ground layer)
import { IM } from './assets.js';
import { cam } from './camera.js';
import { TILE_W, TILE_H, MAP, grid, computeRoadMasks, buildingImage, cellToIso } from './world.js';

let canvas=null, ctx=null;
export function setMainCanvas(c){ canvas=c; ctx=c.getContext('2d',{alpha:false}); }

let needsDraw = true;
export function requestDraw(){ needsDraw=true; drawIfNeeded(); }
function drawIfNeeded(){ if(!needsDraw) return; needsDraw=false; drawAll(); }

// ---------- Offscreen-Boden mit Rand ----------
let groundLayer=null, gtx=null, gW=0, gH=0, PAD=0;

/** Baut die Bodenebene komplett neu auf (bei Resize/Assets/Bauteppich-Änderung aufrufen) */
export function prerenderGround(){
  // Map-Gesamtgröße in Iso-Logikpixel
  const mapW = MAP.W * TILE_W;
  const mapH = MAP.H * TILE_H;

  // Dicke Sicherheitszone außenrum (verhindert schwarze Keile beim Rauszoomen)
  PAD = Math.max(TILE_W, TILE_H) * 8; // ~8 Tiles Rand

  gW = mapW + PAD*2;
  gH = mapH + PAD*2;

  const off = document.createElement('canvas');
  off.width = gW; off.height = gH;
  groundLayer = off;
  gtx = off.getContext('2d', { alpha:false });
  gtx.imageSmoothingEnabled = true;

  // 1) Randfläche füllen (dunkles Gras)
  gtx.fillStyle = '#20361b';
  gtx.fillRect(0,0,gW,gH);

  // 2) Diamant-Kacheln der Map malen (an PAD verschoben)
  for(let y=0;y<MAP.H;y++){
    for(let x=0;x<MAP.W;x++){
      const p=cellToIso(x,y);
      const r={x:p.x + PAD, y:p.y + PAD, w:TILE_W, h:TILE_H};

      gtx.save();
      diamondPath(gtx, r.x,r.y,r.w,r.h); gtx.clip();

      const t=grid[y][x].ground;
      const img = t==='water'?IM.water : t==='shore'?IM.shore : IM.grass;
      if(img) gtx.drawImage(img, r.x-1, r.y-1, r.w+2, r.h+2);
      else { gtx.fillStyle=t==='water'?'#10324a':t==='shore'?'#244822':'#2a3e1f'; gtx.fillRect(r.x,r.y,r.w,r.h); }

      gtx.restore();

      // dezentes Grid (optional, sehr schwach)
      // gtx.strokeStyle='rgba(255,255,255,.03)'; gtx.strokeRect(r.x,r.y,r.w,r.h);
    }
  }
}

function diamondPath(c, x,y,w,h){
  c.beginPath();
  c.moveTo(x + w*0.5, y);
  c.lineTo(x + w,     y + h*0.5);
  c.lineTo(x + w*0.5, y + h);
  c.lineTo(x,         y + h*0.5);
  c.closePath();
}

// ---------- Roads/Buildings ----------
function pickRoadTexture(mask){
  const opp = (mask===0b0101 || mask===0b1010); // N+S oder E+W
  return opp ? (IM.road_straight||IM.road_curve) : (IM.road_curve||IM.road_straight);
}

function drawRoads(){
  computeRoadMasks();
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    if(!grid[y][x].road) continue;
    const p=cellToIso(x,y);
    const r={x:p.x - cam.x, y:p.y - cam.y, w:TILE_W, h:TILE_H};
    ctx.save(); diamondPath(ctx, r.x,r.y,r.w,r.h); ctx.clip();
    const tex=pickRoadTexture(grid[y][x].roadMask);
    if(tex) ctx.drawImage(tex, r.x-1, r.y-1, r.w+2, r.h+2);
    else { ctx.fillStyle='#6b6f7a'; ctx.fillRect(r.x+r.w*.18, r.y+r.h*.36, r.w*.64, r.h*.28); }
    ctx.restore();
  }
}

function drawBuildings(){
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    const b=grid[y][x].building; if(!b) continue;
    const p=cellToIso(x,y);
    const r={x:p.x - cam.x, y:p.y - cam.y, w:TILE_W, h:TILE_H};
    const img=buildingImage(b);
    if(img){
      const w=r.w*1.05, h=img.height*(w/img.width);
      ctx.drawImage(img, r.x+r.w/2-w/2, r.y+r.h - h + r.h*0.10, w, h);
    }else{
      ctx.fillStyle=b==='hq'?'#6a4':(b==='depot'?'#bfa':'#4aa45a');
      ctx.fillRect(r.x+r.w*.12, r.y+r.h*.12, r.w*.76, r.h*.76);
    }
  }
}

// ---------- Haupt-Draw ----------
export function drawAll(){
  if(!canvas) return;

  // Clear & Scale
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.save();
  const z=cam.z;
  ctx.scale(z,z);

  // Hintergrund (falls Offscreen fehlt)
  ctx.fillStyle='#0b0e13';
  ctx.fillRect(0,0, canvas.width/z, canvas.height/z);

  // Boden aus Offscreen (mit PAD-Versatz!)
  if(groundLayer){
    // Wir zeichnen das komplette Offscreen, versetzt um Kamera
    ctx.drawImage(groundLayer, -cam.x - PAD, -cam.y - PAD);
  }

  // Overlay: Roads & Buildings
  drawRoads();
  drawBuildings();

  ctx.restore();
}
