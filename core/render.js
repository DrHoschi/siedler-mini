import { IM } from './assets.js';
import { T, B, tileAt, buildAt } from './world.js';

export class Renderer{
  constructor(canvas, DPR=1){
    this.cv=canvas; this.ctx=canvas.getContext('2d',{alpha:false});
    this.DPR=DPR;
    this.cam={x:0,y:0,z:1};
    this.W=0; this.H=0;
    this.world=null;

    // Iso-Kachel-Größe (Bild ist größer, wir nehmen Denominator für Rechenwege)
    this.tileW = 96; // Bildschirm‑Pixel vor Zoom
    this.tileH = 48;

    this.cv.addEventListener('contextmenu', e=>e.preventDefault(), {passive:false});
  }
  setWorld(world){
    this.world=world;
    // Kamera einmal sinnvoll setzen (HQ in Mitte sichtbar)
    if(!world.camStartSet){
      const cx=(world.W>>1)*this.tileW;
      const cy=(world.H>>1)*this.tileH*0.5;
      // center HQ, kleine Margins
      this.cam.x = cx - this.W*0.5;
      this.cam.y = cy - this.H*0.5;
      world.camStartSet=true;
    }
  }
  setSize(w,h){
    this.W=w; this.H=h;
    // kein zusätzlicher Code nötig – Render berücksichtigt Größe dynamisch
  }

  // ---- Mathe: Iso-Projektion ----
  worldToScreen(wx, wy){ // world coords in „iso‑pixel“ (wx,wy sind kartesisch)
    const sx = (wx - wy) * (this.tileW/2);
    const sy = (wx + wy) * (this.tileH/2);
    return { x: sx, y: sy };
  }
  screenToWorld(sx, sy){ // inverse Projektion (in iso‑pixel ohne Kamera)
    // erst Canvas‑Koords → Welt‑Koords
    const rect=this.cv.getBoundingClientRect();
    const x = (sx-rect.left)/this.cam.z + this.cam.x;
    const y = (sy-rect.top )/this.cam.z + this.cam.y;
    // inverse Iso‑Matrix
    const wx =  (x/(this.tileW/2) + y/(this.tileH/2))/2;
    const wy =  (y/(this.tileH/2) - x/(this.tileW/2))/2;
    return {x:wx, y:wy};
  }
  screenToTile(sx,sy){
    const w = this.screenToWorld(sx,sy);
    // „iso‑pixel“ → Kachel‑Index (jede Kachel 1×1 in Welt‑Koords)
    const tx = Math.floor(w.x);
    const ty = Math.floor(w.y);
    return {tx,ty};
  }

  // ---- Render ----
  render(){
    const ctx=this.ctx;
    // klar
    ctx.save();
    ctx.fillStyle='#0f141b'; ctx.fillRect(0,0,this.cv.width,this.cv.height);
    ctx.scale(this.cam.z,this.cam.z);
    ctx.translate(-this.cam.x, -this.cam.y);

    if(!this.world){ ctx.restore(); return; }

    // Sichtbare Kachelbandbreite großzügig bestimmen (gegen schwarze Ränder)
    const pad = 4;
    const min = this.screenToWorld(0,0);
    const max = this.screenToWorld(this.W, this.H);
    let minTx = Math.floor(Math.min(min.x, max.x))-pad;
    let minTy = Math.floor(Math.min(min.y, max.y))-pad;
    let maxTx = Math.ceil (Math.max(min.x, max.x))+pad;
    let maxTy = Math.ceil (Math.max(min.y, max.y))+pad;

    // Clampen gegen Welt
    minTx=Math.max(-pad, minTx); minTy=Math.max(-pad, minTy);
    maxTx=Math.min(this.world.W+pad, maxTx);
    maxTy=Math.min(this.world.H+pad, maxTy);

    // Boden
    for(let ty=minTy; ty<maxTy; ty++){
      for(let tx=minTx; tx<maxTx; tx++){
        const t = tileAt(this.world, tx,ty);
        const p = this.worldToScreen(tx,ty);
        this.drawTile(p.x, p.y, t);
      }
    }
    // Gebäude & Straße
    for(let ty=minTy; ty<maxTy; ty++){
      for(let tx=minTx; tx<maxTx; tx++){
        const b = buildAt(this.world, tx,ty); if(!b) continue;
        const p = this.worldToScreen(tx,ty);
        this.drawBuild(p.x, p.y, b);
      }
    }
    ctx.restore();
  }

  drawTile(px,py,t){
    const ctx=this.ctx;
    // Die Images sind so gemalt, dass ihr „Mittelpunkt“ auf der Iso‑Rautenmitte liegt.
    const x = px - (this.tileW/2);
    const y = py - (this.tileH/2);
    const img =
      (t===T.WATER && IM.water) ? IM.water :
      (t===T.SHORE && IM.shore) ? IM.shore :
      (t===T.DIRT  && IM.dirt)  ? IM.dirt  :
      (t===T.ROCK  && IM.rocky) ? IM.rocky :
      (t===T.SAND  && IM.sand)  ? IM.sand  :
      IM.grass;
    if(img) ctx.drawImage(img, x, y);
    else { ctx.fillStyle='#1f2b1f'; ctx.fillRect(x,y,this.tileW,this.tileH); }
  }

  drawBuild(px,py,b){
    const ctx=this.ctx;
    const x = px - (this.tileW/2);
    const y = py - (this.tileH*0.9); // etwas höher, damit Gebäude „stehen“
    let img=null;
    if(b===B.HQ) img = IM.hq_stone || IM.hq || null;
    else if(b===B.LUMBER) img = IM.lumber;
    else if(b===B.DEPOT)  img = IM.depot;
    else if(b===B.ROAD)   img = IM.road || IM.road_straight;

    if(img) ctx.drawImage(img, x, y);
    else if(b===B.ROAD){
      ctx.fillStyle='#6b6f7a';
      ctx.fillRect(px-8, py-3, 16, 6);
    }
  }
}
