// core/render.js — Isometrisches Rendering (keine Welt-Importe!)

import { IM } from './assets.js';

// Einheitliche Tile-Maße
export const TILE_W = 96;
export const TILE_H = 48;
export const HALF_W = TILE_W/2;
export const HALF_H = TILE_H/2;

// Welt -> Screen (ohne Kamera)
export function worldToScreen(ix,iy){
  return { wx:(ix-iy)*HALF_W, wy:(ix+iy)*HALF_H };
}

// Textur zeichnen oder Fallback
function drawTile(ctx, img, sx, sy, w=TILE_W, h=TILE_H, fallback='#3c5'){
  if(img){ ctx.drawImage(img, sx, sy, w, h); }
  else{ ctx.fillStyle=fallback; ctx.fillRect(sx, sy, w, h); }
}

/**
 * drawWorldLayered(ctx, cam, data, view)
 * data: { W,H, tiles (Uint8), roads(Set key "x,y"), buildings:Array<{x,y,type}> }
 * view: {screenW,screenH}
 */
export function drawWorldLayered(ctx, cam, data, view){
  const sw=view.screenW, sh=view.screenH;

  // Sichtfenster grob -> Kachelbereich
  const pad = 4; // großzügig, vermeidet „schwarze Ecken“
  const minX = Math.floor((cam.x - sw*0.5)/HALF_W) - pad;
  const maxX = Math.ceil((cam.x + sw + sw*0.5)/HALF_W) + pad;
  const minY = Math.floor((cam.y - sh*0.5)/HALF_H) - pad;
  const maxY = Math.ceil((cam.y + sh + sh*0.5)/HALF_H) + pad;

  // Boden
  for(let y=minY; y<=maxY; y++){
    for(let x=minX; x<=maxX; x++){
      if(x<0||y<0||x>=data.W||y>=data.H) continue;
      const {wx,wy}=worldToScreen(x,y);
      const sx=(wx - cam.x) * cam.z;
      const sy=(wy - cam.y) * cam.z;
      // Tile wählen
      const t = data.tiles[y*data.W+x]; // 0=grass,1=water,2=shore,3=dirt
      const img = t===1? IM.water : t===2? IM.shore : t===3? IM.dirt : IM.grass;
      drawTile(ctx, img, sx, sy, TILE_W*cam.z, TILE_H*cam.z);
      // einfache Rasterlinie (sehr dezent)
      ctx.strokeStyle='rgba(0,0,0,.12)';
      ctx.strokeRect(sx, sy, TILE_W*cam.z, TILE_H*cam.z);
    }
  }

  // Straßen (einfach)
  if(data.roads){
    ctx.globalAlpha=0.95;
    for(const k of data.roads){
      const [x,y]=k.split(',').map(n=>+n);
      if(x<0||y<0||x>=data.W||y>=data.H) continue;
      const {wx,wy}=worldToScreen(x,y);
      const sx=(wx - cam.x) * cam.z;
      const sy=(wy - cam.y) * cam.z;
      drawTile(ctx, IM.road||IM.road_straight, sx, sy, TILE_W*cam.z, TILE_H*cam.z, '#775');
    }
    ctx.globalAlpha=1;
  }

  // Gebäude
  for(const b of data.buildings){
    const {wx,wy}=worldToScreen(b.x,b.y);
    const sx=(wx - cam.x) * cam.z;
    const sy=(wy - cam.y) * cam.z;
    let img=null, color='#468';
    if(b.type==='HQ_STONE') img=IM.hq_stone, color='#789';
    else if(b.type==='HQ_WOOD') img=IM.hq_wood, color='#685';
    else if(b.type==='LUMBER') img=IM.lumber, color='#574';
    else if(b.type==='DEPOT') img=IM.depot, color='#846';
    drawTile(ctx, img, sx, sy, TILE_W*cam.z, TILE_H*cam.z, color);
  }
}
