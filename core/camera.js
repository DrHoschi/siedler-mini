// V14.1 – Mobile Kamera mit Clamp & Zoom‑zum‑Finger
export class Camera {
  constructor(viewW, viewH, tileW = 128, tileH = 64){
    this.viewW = viewW;
    this.viewH = viewH;
    this.tileW = tileW;
    this.tileH = tileH;

    this.x = 0;            // linke/obere Welt‑Pixelkoordinate (in „Pixel“, unskaliert)
    this.y = 0;
    this.scale = 1;

    this.minScale = 0.35;
    this.maxScale = 2.5;

    this.mapPxW = 0;
    this.mapPxH = 0;
  }

  setViewport(w, h){
    this.viewW = w; this.viewH = h;
    this.clamp();
  }

  setMapPixelSize(pxW, pxH){
    this.mapPxW = pxW; this.mapPxH = pxH;
    this.clamp();
  }

  centerOn(px, py){
    this.x = px - (this.viewW / 2) / this.scale;
    this.y = py - (this.viewH / 2) / this.scale;
    this.clamp();
  }

  pan(dx, dy){
    // dx/dy sind Screen‑Pixel → erst in Weltpixel umrechnen
    this.x += dx / this.scale;
    this.y += dy / this.scale;
    this.clamp();
  }

  zoomAt(factor, cx, cy){
    const old = this.scale;
    let next = old * factor;
    if (next < this.minScale) next = this.minScale;
    if (next > this.maxScale) next = this.maxScale;
    if (next === old) return;

    // Weltpunkt unter dem Finger beibehalten
    const wx = this.x + cx / old;
    const wy = this.y + cy / old;

    this.scale = next;
    this.x = wx - cx / next;
    this.y = wy - cy / next;

    this.clamp();
  }

  clamp(){
    // Begrenzung auf Kartenränder (in Weltpixeln)
    const maxX = Math.max(0, this.mapPxW / this.scale - this.viewW / this.scale);
    const maxY = Math.max(0, this.mapPxH / this.scale - this.viewH / this.scale);
    if (this.x < 0) this.x = 0; else if (this.x > maxX) this.x = maxX;
    if (this.y < 0) this.y = 0; else if (this.y > maxY) this.y = maxY;
  }
}
