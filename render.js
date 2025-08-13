// render.js
import { IM } from './core/assets.js';

export class Renderer {
  constructor(canvas, camera, world){
    this.cv=canvas; this.cx=canvas.getContext('2d');
    this.camera=camera; this.world=world;
    this.tileW=64; this.tileH=32; // isometrisches Rhombus-Basismass
  }

  isoToWorld(i,j){
    // ground tile center in Pixel (Welt)
    const x = (i - j) * this.tileW/2;
    const y = (i + j) * this.tileH/2;
    return {x,y};
  }

  worldToIso(wx,wy){
    const i = Math.round((wx/ (this.tileW/2) + wy /(this.tileH/2))/2);
    const j = Math.round((wy /(this.tileH/2) - wx /(this.tileW/2))/2);
    return {i,j};
  }

  draw(){
    const {cx,cv,camera:cam,world:w} = this;
    cx.clearRect(0,0,cv.width,cv.height);

    // Sichtfenster -> Iso‑Bounds abschätzen
    const tl = cam.screenToWorld(0,0);
    const br = cam.screenToWorld(cv.width,cv.height);
    const pad = 4;

    const toIJ = p => this.worldToIso(p.x,p.y);
    const ijTL = toIJ(tl);
    const ijBR = toIJ(br);

    const iMin = Math.max(-pad, Math.min(ijTL.i, ijBR.i)-pad);
    const jMin = Math.max(-pad, Math.min(ijTL.j, ijBR.j)-pad);
    const iMax = Math.min(w.size+pad, Math.max(ijTL.i, ijBR.i)+pad);
    const jMax = Math.min(w.size+pad, Math.max(ijTL.j, ijBR.j)+pad);

    // Boden
    for(let j=jMin;j<jMax;j++){
      for(let i=iMin;i<iMax;i++){
        if(i<0||j<0||i>=w.size||j>=w.size) continue;
        const pos = this.isoToWorld(i,j);
        const sc = cam.worldToScreen(pos.x, pos.y);
        const img = w.groundImg(i,j) || IM.grass;
        if(img) this.drawIso(img, sc.x, sc.y);
        else this.drawDiamond(sc.x, sc.y, '#2a3b22');
      }
    }

    // Straßen und Gebäude
    w.eachRoad((i,j,kind)=>{
      const pos = this.isoToWorld(i,j);
      const sc = cam.worldToScreen(pos.x, pos.y);
      const img = IM.road || IM.road_straight || null;
      if(img) this.drawIso(img, sc.x, sc.y);
      else this.drawDiamond(sc.x, sc.y, '#6b5532');
    });

    w.eachBuilding(b=>{
      const pos = this.isoToWorld(b.i,b.j);
      const sc = cam.worldToScreen(pos.x, pos.y - 14); // leicht nach oben
      const img = b.type==='hq' ? (IM.hq_stone||IM.hq_wood) :
                 b.type==='lumberjack' ? IM.lumberjack :
                 b.type==='depot' ? IM.depot : null;
      if(img) this.drawIso(img, sc.x, sc.y);
      else this.drawDiamond(sc.x, sc.y, '#444a66');
    });

    // Träger
    for(const c of w.carriers){
      const p = c.pos;
      const sc = cam.worldToScreen(p.x,p.y-8);
      const sprite = IM.carrier;
      if(sprite) this.drawIso(sprite, sc.x, sc.y);
      else { cx.fillStyle='#ffd06e'; cx.beginPath(); cx.arc(sc.x,sc.y,4,0,Math.PI*2); cx.fill(); }
    }
  }

  drawIso(img, sx, sy){
    const {cx,camera:cam,tileW,tileH} = this;
    const w = img.naturalWidth||img.width||tileW;
    const h = img.naturalHeight||img.height||tileH;
    cx.drawImage(img, sx*cam.scale - w/2*cam.scale, sy*cam.scale - h/2*cam.scale, w*cam.scale, h*cam.scale);
  }
  drawDiamond(sx,sy,color){
    const {cx, camera:cam, tileW, tileH} = this;
    const w = tileW*cam.scale, h=tileH*cam.scale;
    cx.fillStyle=color;
    cx.beginPath();
    cx.moveTo(sx*cam.scale, (sy-h/2));
    cx.lineTo(sx*cam.scale + w/2, sy);
    cx.lineTo(sx*cam.scale, (sy+h/2));
    cx.lineTo(sx*cam.scale - w/2, sy);
    cx.closePath(); cx.fill();
  }
}
