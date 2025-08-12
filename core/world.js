// Welt + Bauen (einfach) + Tools
import { IM } from './assets.js';
import { cam } from './camera.js';
import { requestDraw } from './render.js';

export const TILE_W = 96;
export const TILE_H = 54;
export const MAP = { W:48, H:36 };

export const grid = Array.from({length:MAP.H},()=>Array.from({length:MAP.W},()=>({
  ground:'grass', road:false, roadMask:0, building:null
})));

let currentTool = 'pointer';

export function setTool(t){ currentTool=t; }

// Map erstellen
export function initWorld(){
  // Wasserteich
  for(let y=20;y<30;y++) for(let x=4;x<16;x++) grid[y][x].ground='water';
  // Shore an Randzellen
  for(let y=1;y<MAP.H-1;y++) for(let x=1;x<MAP.W-1;x++){
    if(grid[y][x].ground==='water') continue;
    const near = [
      [1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]
    ].some(([dx,dy])=> grid[y+dy]?.[x+dx]?.ground==='water');
    if(near) grid[y][x].ground='shore';
  }
}

// Iso-Mathe
function cellToIso(x,y){ return { x:(x - y)*(TILE_W/2), y:(x + y)*(TILE_H/2) }; }
function screenToCell(sx,sy){
  const wx = sx/cam.z + cam.x, wy = sy/cam.z + cam.y;
  const fx = (wy/(TILE_H/2) + wx/(TILE_W/2))/2;
  const fy = (wy/(TILE_H/2) - wx/(TILE_W/2))/2;
  let x=Math.floor(fx), y=Math.floor(fy);
  if(x<0||y<0||x>=MAP.W||y>=MAP.H) return null;
  const cx=(x-y)*(TILE_W/2), cy=(x+y)*(TILE_H/2);
  const dx=(wx-cx)/(TILE_W/2)-0.5, dy=(wy-cy)/(TILE_H/2)-0.5;
  if(Math.abs(dx)+Math.abs(dy)>0.5){
    if(dy>Math.abs(dx)) y++; else if(-dy>Math.abs(dx)) y--;
    else if(dx>0) x++; else x--;
    if(x<0||y<0||x>=MAP.W||y>=MAP.H) return null;
  }
  return {x,y};
}

// Straßenmasken (Basis)
export function computeRoadMasks(){
  const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
  for(let y=0;y<MAP.H;y++)for(let x=0;x<MAP.W;x++){
    if(!grid[y][x].road){ grid[y][x].roadMask=0; continue; }
    let m=0; dirs.forEach(([dx,dy],i)=>{ const nx=x+dx, ny=y+dy; if(grid[ny]?.[nx]?.road) m|=(1<<i); });
    grid[y][x].roadMask=m;
  }
}

// Bauen an Bildschirmposition
export function buildAtScreen(sx,sy){
  const c=screenToCell(sx,sy); if(!c) return false;
  const {x,y}=c;
  if(grid[y][x].ground==='water' && currentTool!=='pointer') return false;

  if(currentTool==='road'){
    grid[y][x].road=true; computeRoadMasks(); return true;
  }
  if(currentTool==='bulldoze'){
    grid[y][x].road=false; grid[y][x].roadMask=0; grid[y][x].building=null; return true;
  }
  if(currentTool==='hq'){ grid[y][x].building='hq'; return true; }
  if(currentTool==='lumber'){ grid[y][x].building='lumber'; return true; }
  if(currentTool==='depot'){ grid[y][x].building='depot'; return true; }
  return false;
}

// Renderer-Helfer
export function buildingImage(b){
  if(b==='hq') return IM.hq;
  if(b==='lumber') return IM.lumber;
  if(b==='depot') return IM.depot;
  return null;
}
export { cellToIso };
