// core/path-overlay.js
// v1.0.0 – leichtes Weg-Overlay

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class _PathOverlay {
  constructor(){
    this.inited = false;
    this.tileSize = 64;
    this.worldW = 0;
    this.worldH = 0;

    // internes Canvas (größer als Viewport, aber auf Welt begrenzt)
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true, willReadFrequently: false });

    // Parameter (kannst du in overlay-hooks überschreiben)
    this.spacingPx = 10;
    this.baseAlpha = 0.06;
    this.decayPerSec = 0.012;
    this.compositeMode = 'source-over';
    this.tint = 'rgba(115,85,50,0.65)'; // leicht erdiger Ton
    this.angleStretch = 1.25;

    this._accum = 0;
  }

  async init({ tileSize, worldWidthPx, worldHeightPx, brushes }){
    this.tileSize = tileSize || this.tileSize;
    this.worldW = worldWidthPx;
    this.worldH = worldHeightPx;

    this.canvas.width  = worldWidthPx;
    this.canvas.height = worldHeightPx;
    this.inited = true;
    console.log('[PathOverlay] ready', {tileSize, worldWidthPx, worldHeightPx});
  }

  /** mildes Verblassen */
  update(dt=0){
    if (!this.inited) return;
    this._accum += dt;
    if (this._accum < 0.25) return; // 4x/Sek. dezent
    this._accum = 0;

    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.globalAlpha = clamp(this.decayPerSec * 0.25, 0, 1);
    c.fillRect(0,0,this.canvas.width,this.canvas.height);
    c.restore();
  }

  /** zeichnet Overlay auf den Screen-ctx */
  render(screenCtx, camera){
    if (!this.inited) return;
    const sx = Math.floor(camera?.x || 0);
    const sy = Math.floor(camera?.y || 0);
    const sw = Math.floor(camera?.w || (screenCtx.canvas.width));
    const sh = Math.floor(camera?.h || (screenCtx.canvas.height));
    screenCtx.save();
    screenCtx.globalCompositeOperation = this.compositeMode;
    screenCtx.drawImage(this.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    screenCtx.restore();
  }

  /** „Stempelt“ eine weiche Spur bei Welt-Pixelkoordinate x/y */
  stampAt(x, y, angle=0, strength=1){
    if (!this.inited) return;
    const c = this.ctx;
    const r = this.tileSize * 0.30 * (1 + Math.abs(Math.cos(angle))*this.angleStretch);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, this.tint);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save();
    c.globalAlpha = clamp(this.baseAlpha * strength, 0, 1);
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill();
    c.restore();
  }
}

export const PathOverlay = new _PathOverlay();

// optional: global für schnelle Tests
if (!window.PathOverlay) window.PathOverlay = PathOverlay;
