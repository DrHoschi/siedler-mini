// Zeichnen von Boden + Minimap in isometrischer Projektion
import { IM } from './assets.js';
import { cam } from './camera.js';
import { TILE_W, TILE_H, MAP, grid } from './world.js';

let canvas=null, ctx=null, mini=null, mctx=null;

export function setMainCanvas(c){ canvas=c; ctx=c.getContext('2d',{alpha:false}); }
export function setMiniMapCanvas(m){ mini=m; mctx=m.getContext('2d',{alpha:false}); }

function cellToIso(x,y){ return { x:(x - y)*(TILE_W/2), y:(x + y)*(TILE_H/2) }; }
function rectFor(x,y){ const p=cellToIso(x,y); return { x:p.x - cam.x, y:p.y - cam.y, w:TILE_W, h:TILE_H }; }

function diamondPath(x,y,w,h){
  ctx.beginPath();
  ctx.moveTo(x + w*0.5, y);
  ctx.lineTo(x + w,     y + h*0.5);
  ctx.lineTo(x + w*0.5, y + h);
  ctx.lineTo(x,         y + h*0.5);
  ctx.closePath();
}

function drawGround(){
  for(let y=0;y<MAP.H;y++){
    for(let x=0;x<MAP.W;x++){
      const r=rectFor(x,y);
      ctx.save(); diamondPath(r.x,r.y,r.w,r.h); ctx.clip();
      const t = grid[y][x].ground;
      const img = t==='water' ? IM.water : t==='shore' ? IM.shore : IM.grass;
      if(img) ctx.drawImage(img, r.x-1, r.y-1, r.w+2, r.h+2);
      else { ctx.fillStyle = t==='water'?'#10324a' : t==='shore'?'#244822' : '#2a3e1f'; ctx.fillRect(r.x,r.y,r.w,r.h); }
      ctx.restore();
      ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.strokeRect(r.x,r.y,r.w,r.h);
    }
  }
}

function drawMini(){
  if(!mini) return;
  const w=mini.width, h=mini.height, sx=w/MAP.W, sy=h/MAP.H;
  mctx.clearRect(0,0,w,h);
  for(let y=0;y<MAP.H;y++) for(let x=0;x<MAP.W;x++){
    const t=grid[y][x].ground;
    mctx.fillStyle = t==='water' ? '#1a3a55' : t==='shore' ? '#2d5128' : '#21451f';
    mctx.fillRect(x*sx, y*sy, sx, sy);
  }
}

export function drawAll(){
  if(!canvas) return;
  // Reset + Clear
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Zoom/Scale (wir zeichnen in Logik-Px; Canvas ist DPR‑skaliert)
  ctx.save();
  const z = cam.z;
  ctx.scale(z, z);

  // Hintergrund
  ctx.fillStyle = '#0b0e13';
  ctx.fillRect(0,0, canvas.width/z, canvas.height/z);

  // Boden
  drawGround();

  ctx.restore();

  // Minimap
  drawMini();
}

// Hilfsfunktionen für Input (Zoom zum Punkt)
export function screenToWorld(sx, sy){
  // Screen-Px → Logik-Px (vor Iso)
  const wx = sx / cam.z + cam.x;
  const wy = sy / cam.z + cam.y;
  return { wx, wy };
}
export function zoomAt(sx, sy, factor){
  const { wx, wy } = screenToWorld(sx, sy);
  cam.z = Math.max(0.6, Math.min(2.6, cam.z * factor));
  cam.x = wx - sx / cam.z;
  cam.y = wy - sy / cam.z;
}
