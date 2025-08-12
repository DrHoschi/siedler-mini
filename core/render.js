// render.js – V13.7.2 – stabiler Iso-Renderer mit Kamera-Zentrierung
export class IsoRenderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.TW = opts.tileW ?? 128;      // Breite der Iso-Raute (Screen)
    this.TH = opts.tileH ?? 64;       // Höhe der Iso-Raute (Screen)
    this.Z  = opts.zoom ?? 1;         // Zoom-Faktor (1 = 100%)
    this.cx = 0;                      // Kamera: Welt-X (in ISO-Spalten)
    this.cy = 0;                      // Kamera: Welt-Y (in ISO-Reihen)
    this.bg = opts.bg ?? '#0f172a';   // Hintergrund

    this.pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    this.resizeObserver = new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();

    // Pre-bind
    this.worldToScreen = this.worldToScreen.bind(this);
    this.screenToWorld = this.screenToWorld.bind(this);
  }

  destroy(){
    this.resizeObserver?.disconnect();
  }

  setZoom(z, pivotScreen=null){
    // Zoom zur Cursor-Position (optional)
    const oldZ = this.Z;
    const newZ = Math.max(0.25, Math.min(3, z));
    if (!pivotScreen){
      this.Z = newZ;
      return;
    }
    // Weltkoordinate vor dem Zoom merken:
    const w = this.screenToWorld(pivotScreen.x, pivotScreen.y);
    this.Z = newZ;
    // Danach gleiche Weltkoordinate wieder unter den Cursor legen:
    const s = this.worldToScreen(w.x, w.y);
    this.cx += (pivotScreen.x - s.x) / (this.TW * 0.5 * this.Z);
    this.cy += (pivotScreen.y - s.y) / (this.TH * 0.5 * this.Z);
  }

  setCameraCenter(worldX, worldY){ this.cx = worldX; this.cy = worldY; }
  nudgeCamera(dx, dy){ this.cx += dx; this.cy += dy; }

  resize(){
    const r = this.pixelRatio;
    const w = this.canvas.clientWidth|0;
    const h = this.canvas.clientHeight|0;
    this.canvas.width  = Math.max(1, (w * r)|0);
    this.canvas.height = Math.max(1, (h * r)|0);
    this.ctx.setTransform(r,0,0,r,0,0);
  }

  clear(){
    this.ctx.fillStyle = this.bg;
    this.ctx.fillRect(0,0,this.canvas.width/this.pixelRatio,this.canvas.height/this.pixelRatio);
  }

  // ---- Iso-Konvertierung
  // Welt (i,j) -> Screen (x,y)
  worldToScreen(i, j){
    // klassische 2:1-Iso
    const halfW = this.TW * 0.5 * this.Z;
    const halfH = this.TH * 0.5 * this.Z;
    const ox = (this.canvas.clientWidth  * 0.5);
    const oy = (this.canvas.clientHeight * 0.5);
    const dx = (i - this.cx);
    const dy = (j - this.cy);
    const x = ox + (dx - dy) * halfW;
    const y = oy + (dx + dy) * halfH;
    return { x, y };
  }

  // Screen (px,py) -> Welt (i,j)
  screenToWorld(px, py){
    const halfW = this.TW * 0.5 * this.Z;
    const halfH = this.TH * 0.5 * this.Z;
    const ox = (this.canvas.clientWidth  * 0.5);
    const oy = (this.canvas.clientHeight * 0.5);
    const sx = (px - ox);
    const sy = (py - oy);
    // Inverse der obigen Linearkombination:
    const dx =  (sx / (2*halfW)) + (sy / (2*halfH));
    const dy = -(sx / (2*halfW)) + (sy / (2*halfH));
    return { x: this.cx + dx, y: this.cy + dy };
  }

  // Zeichne eine einzelne Iso-Kachel-Textur mittig auf (i,j)
  drawTileImage(img, i, j){
    const p = this.worldToScreen(i, j);
    const w = this.TW * this.Z;
    const h = this.TH * this.Z;
    // Texturen sind in deinem Projekt als "hochstehende" Rauten angelegt.
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(img, p.x - w*0.5, p.y - h*0.75, w, h); // kleiner Y-Offset für „Höhe“
  }

  // Hilfs-Gitter (Debug)
  drawGrid(area, color='rgba(255,255,255,0.06)'){
    const {minI,maxI,minJ,maxJ} = area;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for(let i=minI;i<=maxI;i++){
      for(let j=minJ;j<=maxJ;j++){
        const p = this.worldToScreen(i,j);
        const hw = this.TW*0.5*this.Z, hh=this.TH*0.5*this.Z;
        this.ctx.moveTo(p.x, p.y-hh);
        this.ctx.lineTo(p.x+hw, p.y);
        this.ctx.lineTo(p.x, p.y+hh);
        this.ctx.lineTo(p.x-hw, p.y);
        this.ctx.closePath();
      }
    }
    this.ctx.stroke();
  }

  // Sichtbereich als Welt-Bounds (für culling)
  getVisibleWorldBounds(pad=2){
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    const tl = this.screenToWorld(0,0);
    const tr = this.screenToWorld(W,0);
    const bl = this.screenToWorld(0,H);
    const br = this.screenToWorld(W,H);
    const minI = Math.floor(Math.min(tl.x,tr.x,bl.x,br.x)) - pad;
    const maxI = Math.ceil (Math.max(tl.x,tr.x,bl.x,br.x)) + pad;
    const minJ = Math.floor(Math.min(tl.y,tr.y,bl.y,br.y)) - pad;
    const maxJ = Math.ceil (Math.max(tl.y,tr.y,bl.y,br.y)) + pad;
    return {minI,maxI,minJ,maxJ};
  }

  // Debug-Anzeige oben rechts
  drawDebug(text){
    this.ctx.save();
    this.ctx.font = '12px system-ui, sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const s = Array.isArray(text)? text.join('  |  ') : text;
    this.ctx.fillText(s, this.canvas.clientWidth-10, 8);
    this.ctx.restore();
  }
}
