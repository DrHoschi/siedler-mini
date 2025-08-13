// /core/camera.js
export class Camera {
  constructor(){
    this.scale = 1;
    this.min = 0.35;
    this.max = 2.25;
    this.x = 0; this.y = 0;       // Welt-Offset (Pixel)
    this.viewW = 0; this.viewH = 0;
  }
  setViewport(w,h){ this.viewW=w; this.viewH=h; }
  centerOn(px,py){ this.x = px - this.viewW/2; this.y = py - this.viewH/2; }
  worldToScreen(px,py){ return { x:(px - this.x)*this.scale, y:(py - this.y)*this.scale }; }
  screenToWorld(sx,sy){ return { x: sx/this.scale + this.x, y: sy/this.scale + this.y }; }
  zoomAround(cx,cy,delta){           // cx/cy in Screen-Koordinaten
    const before = this.screenToWorld(cx,cy);
    this.scale = Math.min(this.max, Math.max(this.min, this.scale * (delta>0 ? 1.1 : 0.9)));
    const after = this.screenToWorld(cx,cy);
    this.x += (before.x - after.x);
    this.y += (before.y - after.y);
  }
  pan(dx,dy){ this.x += dx/this.scale; this.y += dy/this.scale; }
}
