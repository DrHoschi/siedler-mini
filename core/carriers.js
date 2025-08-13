// core/camera.js  v14.2
export class Camera{
  constructor(){
    this.x=0; this.y=0; this.zoom=1;
    this.minZoom=.5; this.maxZoom=2;
  }
  centerOn(px,py){ this.x=px; this.y=py; this.clamp(); }
  pan(dx,dy){ this.x+=dx/this.zoom; this.y+=dy/this.zoom; this.clamp(); }
  setZoom(n, anchorX=0, anchorY=0){
    const old=this.zoom;
    n=Math.max(this.minZoom, Math.min(this.maxZoom, n));
    if (n===old) return;
    // Zoom um Ankerpunkt (Weltkoordinaten)
    const k=n/old;
    this.x = anchorX + (this.x - anchorX)/k;
    this.y = anchorY + (this.y - anchorY)/k;
    this.zoom=n; this.clamp();
  }
  clamp(){
    // einfache Soft‑Bounds
    const pad=400;
    this.x=Math.max(-pad, Math.min(this.x, pad));
    this.y=Math.max(-pad, Math.min(this.y, pad));
  }
}
