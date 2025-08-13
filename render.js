// V14.1 – isometrischer Renderer (nur Sichtbereich)
import { IM } from './core/assets.js';

export class Renderer {
  constructor(ctx, cam, world){
    this.ctx=ctx; this.cam=cam; this.world=world;
    this.tileW=128; this.tileH=64; // Grundrhombus
    this.cam.setMapPixelSize(world.w*this.tileW, world.h*this.tileH);
  }
  screenToWorldTile(sx,sy){
    // Screen -> Weltpixel
    const wx = this.cam.x*this.cam.scale + sx;
    const wy = this.cam.y*this.cam.scale + sy;
    // Pixel -> Iso‑Tile‑Index (ungefähr; mit 128×64 Grundraster)
    const ix = Math.floor((wx/this.cam.scale)/this.tileW);
    const iy = Math.floor((wy/this.cam.scale)/this.tileH);
    return {tx:ix, ty:iy};
  }
  centerOnTile(tx,ty){
    const px = tx*this.tileW + this.tileW/2;
    const py = ty*this.tileH + this.tileH/2;
    this.cam.centerOn(px,py);
  }
  draw(){
    const {ctx,cam,world} = this;
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);

    const s=cam.scale;
    ctx.save();
    ctx.translate(-cam.x*s, -cam.y*s);
    ctx.scale(s,s);

    // Sichtfenster in Tile‑Koords
    const minX = Math.max(0, Math.floor(cam.x/this.tileW)-2);
    const minY = Math.max(0, Math.floor(cam.y/this.tileH)-2);
    const maxX = Math.min(world.w-1, Math.ceil((cam.x+cam.viewW/s)/this.tileW)+2);
    const maxY = Math.min(world.h-1, Math.ceil((cam.y+cam.viewH/s)/this.tileH)+2);

    for(let ty=minY; ty<=maxY; ty++){
      for(let tx=minX; tx<=maxX; tx++){
        const x = tx*this.tileW, y=ty*this.tileH;
        // Boden (Gras/Wasser/Sand …)
        const t = world.terrain[ty][tx];
        const img = pickBase(t);
        if (img) ctx.drawImage(img, x, y, this.tileW, this.tileH);
        else { // Fallback
          ctx.fillStyle = t==='water' ? '#2b87c5' : '#2e6d1a';
          ctx.fillRect(x,y,this.tileW,this.tileH);
        }
        // Straße
        if (world.roads[ty][tx]) {
          const rimg = IM.road || IM.road_straight;
          if (rimg) ctx.drawImage(rimg, x, y, this.tileW,this.tileH);
          else { ctx.fillStyle='rgba(180,120,60,.8)'; ctx.fillRect(x+40,y+28,48,8); }
        }
        // Gebäude
        const b = world.buildings[ty][tx];
        if (b){
          const bimg = b.kind==='hq' ? (IM.hq_stone||IM.hq_wood) :
                       b.kind==='lumber' ? IM.lumberjack :
                       b.kind==='depot' ? IM.depot : null;
          if (bimg) ctx.drawImage(bimg, x, y-32, this.tileW, this.tileH+32);
          else { ctx.fillStyle='#d6c08a'; ctx.fillRect(x+16,y+10,96,44); }
        }
      }
    }

    ctx.restore();
  }
}

function pickBase(t){
  switch(t){
    case 'water': return IM.water;
    case 'shore': return IM.shore;
    case 'sand' : return IM.sand;
    case 'rocky': return IM.rocky;
    case 'dirt' : return IM.dirt;
    default: return IM.grass;
  }
}
