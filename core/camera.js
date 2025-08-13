// V14.1 – Mobile Kamera mit Clamp & Zoom‑zum‑Finger
export class Camera {
  constructor(w,h,tileW,tileH){
    this.viewW=w; this.viewH=h;
    this.tileW=tileW; this.tileH=tileH;
    this.x=0; this.y=0;         // Weltkoordinaten (Pixel in Iso‑Space)
    this.scale=1;               // Zoom
    this.minScale=0.35;         // Grenzen
    this.maxScale=2.5;
    this.mapPxW=0; this.mapPxH=0; // vom Renderer gesetzt
  }
  setViewport(w,h){ this.viewW=w; this.viewH=h; this.clamp(); }
  setMapPixelSize(w,h){ this.mapPxW=w; this.mapPxH=h; this.clamp(); }
  centerOn(px,py){ this.x=px-this.viewW/2/this.scale; this.y=py-this.viewH/2/this.scale; this.clamp(); }
  pan(dx,dy){ this.x+=dx/this.scale; this.y+=dy/this.scale; this.clamp(); }
  zoomAt(factor, cx, cy){
    const old=this.scale;
    let next = Math.min(this.maxScale, Math.max(this.minScale, old*factor));
    if (next===old) return;
    // Fokus halten: Weltpunkt unter (cx,cy) bleibt unter (cx,cy)
    const wx = this.x + cx/old;
    const wy = this.y + cy/old;
    this.scale = next;
    this.x = wx - cx/next;
    this.y = wy - cy/next;
    this.clamp();
  }
  clamp(){
    const maxX = Math.max(0, this.mapPxW/this.scale - this.viewW/this.scale);
    const maxY = Math.max(0, this.mapPxH/this.scale - this.viewH/this.scale);
    this.x = Math.min(Math.max(this.x, 0), maxX);
    this.y = Math.min(Math.max(this.y, 0), maxY);
  }
}
