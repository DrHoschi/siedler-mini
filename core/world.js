// core/world.js – Iso-Welt + exakte Sichtfenster-Berechnung
import { IM } from './assets.js';
import { cam } from './camera.js';
import { requestDraw } from './render.js';

export const TILE_W = 64, TILE_H = 32;

let W=0, H=0;
export let grid=[];

export const TOOLS = { POINTER:'pointer', ROAD:'road', HQ:'hq', LUMBER:'lumber', DEPOT:'depot', BULL:'bulldoze' };
let tool = TOOLS.POINTER;
export function setTool(t){ tool=t; }

export function createWorld(w,h){
  W=w; H=h; grid=new Array(H);
  for(let y=0;y<H;y++){
    grid[y]=new Array(W);
    for(let x=0;x<W;x++){
      grid[y][x]={ ground:'grass', road:false, building:null };
    }
  }
  // kleiner See zum Testen
  for(let y=10;y<26;y++) for(let x=10;x<26;x++)
    grid[y][x].ground = (x===10||x===25||y===10||y===25)?'shore':'water';

  // Kamera ungefähr in die Mitte
  cam.x = (W*TILE_W*0.5) - 240;
  cam.y = (H*TILE_H*0.5) - 160;
  cam.z = 1.1;

  requestDraw();
}

/* ---------- Iso-Helfer ---------- */

// Welt→Screen (Iso)
export function cellToIso(x,y){ 
  return { x:(x-y)*(TILE_W/2), y:(x+y)*(TILE_H/2) };
}

// Screen→Iso (float), benutzt Kamera & Zoom
function screenToIsoFloat(sx,sy){
  const wx = cam.x + sx / cam.z;
  const wy = cam.y + sy / cam.z;
  const ix = 0.5*( wy/(TILE_H/2) + wx/(TILE_W/2) );
  const iy = 0.5*( wy/(TILE_H/2) - wx/(TILE_W/2) );
  return { ix, iy };
}

// Öffentliche Umrechnung für Tap
export function screenToCell(sx,sy){
  const {ix,iy}=screenToIsoFloat(sx,sy);
  const x=Math.floor(ix), y=Math.floor(iy);
  if(x<0||y<0||x>=W||y>=H) return null;
  return {x,y};
}

/* ---------- Bauen ---------- */

export function buildAt(x,y){
  if(x<0||y<0||x>=W||y>=H) return false;
  const c=grid[y][x];
  switch(tool){
    case TOOLS.ROAD:
      if(c.ground!=='water'){ c.road=true; c.building=null; }
      break;
    case TOOLS.HQ:     c.building='hq';     c.road=false; break;
    case TOOLS.LUMBER: c.building='lumber'; c.road=false; break;
    case TOOLS.DEPOT:  c.building='depot';  c.road=false; break;
    case TOOLS.BULL:   c.building=null; c.road=false; break;
    default: return false;
  }
  requestDraw();
  return true;
}

/* ---------- Zeichnen ---------- */

// Sichtfenster korrekt aus vier Canvas-Ecken ableiten
function visibleBounds(camera){
  // Ecken in Screen-Pixel (unskaliert, d.h. „Logik“-Pixel an drawAll übergeben)
  const pts = [
    {sx:0, sy:0},
    {sx:camera.width, sy:0},
    {sx:0, sy:camera.height},
    {sx:camera.width, sy:camera.height},
  ];
  let minX=+Infinity, minY=+Infinity, maxX=-Infinity, maxY=-Infinity;
  for(const p of pts){
    const {ix,iy}=screenToIsoFloat(p.sx, p.sy);
    if(ix<minX)minX=ix; if(ix>maxX)maxX=ix;
    if(iy<minY)minY=iy; if(iy>maxY)maxY=iy;
  }
  // etwas Puffer, dann clampen
  minX=Math.max(0, Math.floor(minX)-3);
  minY=Math.max(0, Math.floor(minY)-3);
  maxX=Math.min(W-1, Math.ceil(maxX)+3);
  maxY=Math.min(H-1, Math.ceil(maxY)+3);
  return {minX,minY,maxX,maxY};
}

export function drawWorld(ctx, camera){
  const {minX,minY,maxX,maxY} = visibleBounds(camera);

  for(let y=minY; y<=maxY; y++){
    for(let x=minX; x<=maxX; x++){
      const p = cellToIso(x,y);
      const rx = p.x - camera.x;
      const ry = p.y - camera.y;

      // Boden
      drawTile(ctx, rx,ry, grid[y][x].ground);

      // Straße (einfaches Autotile)
      if(grid[y][x].road){
        const mask = roadMask(x,y);
        const tex = (mask===0b0101||mask===0b1010) ? (IM.road_straight||IM.road_curve)
                                                   : (IM.road_curve||IM.road_straight);
        drawImageDiamond(ctx, tex, rx,ry, '#6b6f7a');
      }

      // Gebäude
      const b = grid[y][x].building;
      if(b){
        const img = b==='hq'?IM.hq : b==='lumber'?IM.lumber : b==='depot'?IM.depot : null;
        if(img){
          const w=TILE_W*1.05, h=img.height*(w/img.width);
          ctx.drawImage(img, rx+TILE_W/2-w/2, ry+TILE_H - h + TILE_H*0.10, w, h);
        }else{
          ctx.fillStyle = '#88a35a';
          ctx.fillRect(rx+TILE_W*.12, ry+TILE_H*.12, TILE_W*.76, TILE_H*.76);
        }
      }
    }
  }
}

/* ---------- Zeichen‑Hilfen ---------- */

function diamondPath(c, x,y,w,h){
  c.beginPath();
  c.moveTo(x + w*0.5, y);
  c.lineTo(x + w,     y + h*0.5);
  c.lineTo(x + w*0.5, y + h);
  c.lineTo(x,         y + h*0.5);
  c.closePath();
}
function drawTile(ctx, rx,ry, kind){
  const img = kind==='water'?IM.water : kind==='shore'?IM.shore : IM.grass;
  ctx.save(); diamondPath(ctx,rx,ry,TILE_W,TILE_H); ctx.clip();
  if(img) ctx.drawImage(img, rx-1, ry-1, TILE_W+2, TILE_H+2);
  else { ctx.fillStyle = kind==='water'?'#10324a':(kind==='shore'?'#244822':'#2a3e1f'); ctx.fillRect(rx,ry,TILE_W,TILE_H); }
  ctx.restore();
}
function drawImageDiamond(ctx, img, rx,ry, fallback='#777'){
  ctx.save(); diamondPath(ctx,rx,ry,TILE_W,TILE_H); ctx.clip();
  if(img) ctx.drawImage(img, rx-1, ry-1, TILE_W+2, TILE_H+2);
  else { ctx.fillStyle=fallback; ctx.fillRect(rx+TILE_W*.18, ry+TILE_H*.36, TILE_W*.64, TILE_H*.28); }
  ctx.restore();
}
function roadMask(x,y){
  let m=0;
  if(y>0   && grid[y-1][x].road) m|=1;   // N
  if(x<W-1 && grid[y][x+1].road) m|=2;   // E
  if(y<H-1 && grid[y+1][x].road) m|=4;   // S
  if(x>0   && grid[y][x-1].road) m|=8;   // W
  return m;
}
