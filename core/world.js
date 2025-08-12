// Weltlogik & Zeichnen (isometrisch)
import { IM } from './assets.js';
import { cam } from './camera.js';
import { requestDraw } from './render.js';

export const TILE_W = 64, TILE_H = 32;

let W=0,H=0;
export let grid=[];

export const TOOLS = { POINTER:'pointer', ROAD:'road', HQ:'hq', LUMBER:'lumber', DEPOT:'depot', BULL:'bulldoze' };
let tool = TOOLS.POINTER;
export function setTool(t){ tool = t; }

export function createWorld(w,h){
  W=w; H=h; grid=new Array(H);
  for(let y=0;y<H;y++){
    grid[y]=new Array(W);
    for(let x=0;x<W;x++){
      grid[y][x]={ ground:'grass', road:false, building:null };
    }
  }
  // kleiner See links unten
  for(let y=8;y<22;y++)for(let x=8;x<22;x++){
    grid[y][x].ground = (x===8||x===21||y===8||y===21)?'shore':'water';
  }
  // Start‑Kamera ungefähr mittig
  cam.x = (W*TILE_W*0.5) - 180;
  cam.y = (H*TILE_H*0.5) - 120;
  cam.z = 1.2;
}

export function screenToCell(sx,sy){
  const wx = cam.x + sx / cam.z;
  const wy = cam.y + sy / cam.z;
  // inverse Iso
  const ix = (wy/(TILE_H/2) + wx/(TILE_W/2)) * 0.5;
  const iy = (wy/(TILE_H/2) - wx/(TILE_W/2)) * 0.5;
  const x = Math.floor(ix), y = Math.floor(iy);
  if(x<0||y<0||x>=W||y>=H) return null;
  return {x,y};
}

export function buildAt(x,y){
  if(x<0||y<0||x>=W||y>=H) return false;
  const c=grid[y][x];
  switch(tool){
    case TOOLS.ROAD: if(c.ground!=='water'){ c.road=true; c.building=null; } break;
    case TOOLS.HQ:   c.building='hq'; c.road=false; break;
    case TOOLS.LUMBER: c.building='lumber'; c.road=false; break;
    case TOOLS.DEPOT:  c.building='depot'; c.road=false; break;
    case TOOLS.BULL:   c.building=null; c.road=false; break;
    default: return false;
  }
  requestDraw(); return true;
}

// Zeichnen (nur sichtbare Tiles)
export function drawWorld(ctx, camera){
  const z = cam.z||1;
  const startX = Math.max(0, Math.floor(camera.x / TILE_W) - 3);
  const endX   = Math.min(W-1, Math.ceil((camera.x + camera.width) / TILE_W) + 3);
  const startY = Math.max(0, Math.floor(camera.y / TILE_H) - 3);
  const endY   = Math.min(H-1, Math.ceil((camera.y + camera.height)/TILE_H) + 3);

  for(let y=startY; y<=endY; y++){
    for(let x=startX; x<=endX; x++){
      const p = cellToIso(x,y);
      const rx = p.x - camera.x, ry = p.y - camera.y;

      // Boden
      drawDiamond(ctx, rx,ry, TILE_W,TILE_H, grid[y][x].ground);

      // Straße (simple Autotile)
      if(grid[y][x].road){
        const mask = roadMask(x,y);
        const tex = (mask===0b0101||mask===0b1010) ? (IM.road_straight||IM.road_curve)
                                                   : (IM.road_curve||IM.road_straight);
        if(tex) ctxDrawImageClipped(ctx, tex, rx,ry);
        else { // Fallback
          ctx.save(); diamondPath(ctx,rx,ry,TILE_W,TILE_H); ctx.clip();
          ctx.fillStyle='#6b6f7a'; ctx.fillRect(rx+TILE_W*.18, ry+TILE_H*.36, TILE_W*.64, TILE_H*.28);
          ctx.restore();
        }
      }

      // Gebäude
      const b = grid[y][x].building;
      if(b){
        const img = b==='hq'?IM.hq : b==='lumber'?IM.lumber : b==='depot'?IM.depot : null;
        if(img){
          const w=TILE_W*1.05, h=img.height*(w/img.width);
          ctx.drawImage(img, rx+TILE_W/2-w/2, ry+TILE_H - h + TILE_H*0.10, w, h);
        }else{
          ctx.fillStyle = b==='hq'?'#6a4':(b==='depot'?'#8ab':'#4aa45a');
          ctx.fillRect(rx+TILE_W*.12, ry+TILE_H*.12, TILE_W*.76, TILE_H*.76);
        }
      }
    }
  }
}

// Helpers
export function cellToIso(x,y){ return { x:(x-y)*(TILE_W/2), y:(x+y)*(TILE_H/2) }; }
function diamondPath(c, x,y,w,h){
  c.beginPath();
  c.moveTo(x + w*0.5, y);
  c.lineTo(x + w,     y + h*0.5);
  c.lineTo(x + w*0.5, y + h);
  c.lineTo(x,         y + h*0.5);
  c.closePath();
}
function drawDiamond(ctx, rx,ry, w,h, kind){
  const img = kind==='water'?IM.water : kind==='shore'?IM.shore : IM.grass;
  ctx.save(); diamondPath(ctx,rx,ry,w,h); ctx.clip();
  if(img) ctx.drawImage(img, rx-1, ry-1, w+2, h+2);
  else { ctx.fillStyle = kind==='water'?'#10324a':(kind==='shore'?'#244822':'#2a3e1f'); ctx.fillRect(rx,ry,w,h); }
  ctx.restore();
}
function ctxDrawImageClipped(ctx, img, rx,ry){
  ctx.save(); diamondPath(ctx,rx,ry,TILE_W,TILE_H); ctx.clip();
  ctx.drawImage(img, rx-1, ry-1, TILE_W+2, TILE_H+2);
  ctx.restore();
}
function roadMask(x,y){
  let m=0;
  if(y>0       && grid[y-1][x].road) m|=1;      // N
  if(x<W-1     && grid[y][x+1].road) m|=2;      // E
  if(y<H-1     && grid[y+1][x].road) m|=4;      // S
  if(x>0       && grid[y][x-1].road) m|=8;      // W
  return m;
}
