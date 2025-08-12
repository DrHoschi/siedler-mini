// core/render.js
// Isometrischer Renderer + Asset-Loader + Eingabe-Helfer

export class Renderer {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha:false });
    this.DPR = Math.max(1, Math.min(window.devicePixelRatio||1, 2));
    this.resize();
    window.addEventListener('resize', ()=>this.resize(), {passive:true});

    // Iso-Größe je Tile (kannst du bei Bedarf anpassen)
    this.TW = 96;  // Breite eines Rhombus
    this.TH = 48;  // Höhe eines Rhombus

    // Kamera
    this.cameraX = 0;
    this.cameraY = 0;
    this.zoom = 1.0;
    this.minZoom = 0.6;
    this.maxZoom = 2.4;

    // Map
    this.MW = 0; this.MH = 0;
    this.map = null;

    // Assets
    this.img = {}; // key->Image (oder null)
    this.hasImage = (k)=> !!this.img[k];

    // Debug
    this._fps = 0; this._lastFpsT=performance.now(); this._frames=0;
    this._hoverTile = {x:-1,y:-1};
  }

  setMapSize(w,h){ this.MW=w; this.MH=h; }

  async loadAssets(dict){
    const keys = Object.keys(dict);
    await Promise.all(keys.map(k=>this._loadOne(k, dict[k])));
  }
  _loadOne(key, src){
    return new Promise(res=>{
      const img = new Image();
      img.onload = ()=>{ this.img[key]=img; res(); };
      img.onerror = ()=>{ console.warn('[assets] fehlt:', src); this.img[key]=null; res(); };
      img.src = src + ((src.includes('?')?'&':'?')+'v='+Date.now()); // Cache-Bust
    });
  }

  resize(){
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width  = Math.floor(r.width  * this.DPR);
    this.canvas.height = Math.floor(r.height * this.DPR);
    this.ctx.setTransform(this.DPR,0,0,this.DPR,0,0);
  }

  // ---------- Koordinaten ----------
  isoToScreen(ix,iy){
    // Mittelpunkt eines Tiles
    const x = (ix - iy) * (this.TW/2);
    const y = (ix + iy) * (this.TH/2);
    return { x: x*this.zoom + this.cameraX, y: y*this.zoom + this.cameraY };
  }
  screenToIso(sx,sy){
    // Umkehrung (ungefähr) – liefert Float‑Koords
    const x = (sx - this.cameraX)/this.zoom;
    const y = (sy - this.cameraY)/this.zoom;
    const ix = (x/(this.TW/2) + y/(this.TH/2))/2;
    const iy = (y/(this.TH/2) - x/(this.TW/2))/2;
    return { ix, iy };
  }
  screenToTile(sx,sy){
    const {ix,iy} = this.screenToIso(sx,sy);
    // Der Renderer zeichnet Texturen "tile‑zentriert", deshalb runden wir
    const tx = Math.round(ix);
    const ty = Math.round(iy);
    return {tx,ty};
  }

  // ---------- Eingabe‑Hilfen ----------
  beginPinch(p0,p1){
    this._pinch = {
      z0:this.zoom,
      c0:{ x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2 }
    };
  }
  doPinch(p0,p1){
    if(!this._pinch) return;
    const c1 = { x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2 };
    const d0 = Math.hypot(p0.x-p1.x, p0.y-p1.y);
    const d1 = Math.hypot(p0._x-p1._x, p0._y-p1._y); // _x/_y = initial, s. game.js
    const scale = (d0 && d1) ? (d0/d1) : 1;
    const prev = this.zoom;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this._pinch.z0*scale));
    // Zoom zum Pinch‑Mittelpunkt
    const wx = (c1.x - this.cameraX)/prev;
    const wy = (c1.y - this.cameraY)/prev;
    this.cameraX = c1.x - wx*this.zoom;
    this.cameraY = c1.y - wy*this.zoom;
  }
  endPinch(){ this._pinch=null; }

  // ---------- Zeichnen ----------
  drawMap(map){
    if(!map){ this.clear(); return; }
    this.map = map;
    this.clear();

    // sichtbares Bounds grob bestimmen
    const W = this.canvas.width/this.DPR;
    const H = this.canvas.height/this.DPR;

    // vier Eck‑Screens auf Iso -> min/max
    const corners = [
      this.screenToIso(0,0),
      this.screenToIso(W,0),
      this.screenToIso(0,H),
      this.screenToIso(W,H),
    ];
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const c of corners){
      minX = Math.min(minX, c.ix);
      minY = Math.min(minY, c.iy);
      maxX = Math.max(maxX, c.ix);
      maxY = Math.max(maxY, c.iy);
    }
    // Puffer, damit Ränder nicht knipsen
    minX = Math.floor(minX) - 2;
    minY = Math.floor(minY) - 2;
    maxX = Math.ceil(maxX) + 2;
    maxY = Math.ceil(maxY) + 2;

    // Zeichnen
    for(let ty=minY; ty<=maxY; ty++){
      for(let tx=minX; tx<=maxX; tx++){
        if(tx<0||ty<0||tx>=this.MW||ty>=this.MH) continue;
        const cell = map[ty][tx];
        const pos = this.isoToScreen(tx,ty);
        // Boden
        this.drawTileImage(cell.ground, pos.x, pos.y);
        // Objekt
        if(cell.object){
          this.drawTileImage(cell.object, pos.x, pos.y);
        }
      }
    }

    // FPS berechnen
    this._frames++;
    const now = performance.now();
    if(now - this._lastFpsT > 500){
      this._fps = Math.round(this._frames*1000/(now-this._lastFpsT));
      this._frames=0; this._lastFpsT=now;
    }
  }

  drawTileImage(key, cx, cy){
    const img = this.img[key];
    const ctx=this.ctx;
    if(img){
      // Bild so zeichnen, dass das Motiv auf dem Tile‑Mittelpunkt sitzt
      const w = this.TW*this.zoom;
      const h = this.TH*this.zoom;
      ctx.drawImage(img, Math.round(cx - w/2), Math.round(cy - h/2), Math.round(w), Math.round(h));
    }else{
      // Fallback: schraffierte Raute
      const w = this.TW*this.zoom, h=this.TH*this.zoom;
      const x = Math.round(cx), y=Math.round(cy);
      ctx.save();
      ctx.translate(x,y);
      ctx.beginPath();
      ctx.moveTo(0,-h/2); ctx.lineTo(w/2,0); ctx.lineTo(0,h/2); ctx.lineTo(-w/2,0); ctx.closePath();
      ctx.fillStyle = '#1a2130'; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.stroke();
      ctx.restore();
    }
  }

  clear(){
    const ctx=this.ctx, c=this.canvas;
    ctx.fillStyle='#0b0e13';
    ctx.fillRect(0,0,c.width,c.height);
  }

  // Debug‑Text für Overlay
  getDebugText(extra={}){
    const z = this.zoom.toFixed(2);
    const cam = `${Math.round(this.cameraX)}, ${Math.round(this.cameraY)}`;
    return [
      `FPS ${this._fps}`,
      `Zoom ${z}x`,
      `Cam  ${cam}`,
      ...(extra.tile ? [`Tile ${extra.tile.tx}, ${extra.tile.ty}`] : []),
      ...(extra.msg ? [extra.msg] : []),
    ].join('\n');
  }
}
