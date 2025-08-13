// core/camera.js
// V14.2 – sanfter Zoom, sinnvolle Begrenzung mit Puffer

export class Camera {
  constructor(viewW, viewH, worldPxW, worldPxH) {
    this.viewW   = viewW;
    this.viewH   = viewH;
    this.worldW  = worldPxW;
    this.worldH  = worldPxH;

    this.x = 0;
    this.y = 0;
    this.zoom = 1;

    // am Rand leicht überziehen dürfen (damit man nicht „festklebt“)
    this.overscroll = 160;
    this.minZoom = 0.4;
    this.maxZoom = 2.0;

    this._dragLast = null;
  }

  resize(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.clamp();
  }

  centerOn(cx, cy) {
    this.x = cx - this.viewW / 2 / this.zoom;
    this.y = cy - this.viewH / 2 / this.zoom;
    this.clamp();
  }

  clamp() {
    const over = this.overscroll / this.zoom;
    const maxX = this.worldW - this.viewW / this.zoom + over;
    const maxY = this.worldH - this.viewH / this.zoom + over;
    this.x = Math.max(-over, Math.min(this.x, maxX));
    this.y = Math.max(-over, Math.min(this.y, maxY));
    this.zoom = Math.max(this.minZoom, Math.min(this.zoom, this.maxZoom));
  }

  // Pan (in View‑Pixeln)
  panBy(dx, dy) {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.clamp();
  }

  // Zoom um Screen‑Punkt (sx,sy)
  zoomAt(factor, sx, sy) {
    const wx = this.screenToWorldX(sx);
    const wy = this.screenToWorldY(sy);
    const old = this.zoom;
    this.zoom = Math.max(this.minZoom, Math.min(this.zoom * factor, this.maxZoom));
    const k = this.zoom / old;
    // Fokuspunkt unter dem Finger behalten
    this.x = wx - (sx / this.viewW) * (this.viewW / this.zoom);
    this.y = wy - (sy / this.viewH) * (this.viewH / this.zoom);
    this.clamp();
  }

  // Konvertierungen
  screenToWorldX(sx) { return this.x + sx / this.zoom; }
  screenToWorldY(sy) { return this.y + sy / this.zoom; }
  worldToScreenX(wx) { return (wx - this.x) * this.zoom; }
  worldToScreenY(wy) { return (wy - this.y) * this.zoom; }

  // Drag‑Start/Move/End als Helfer (optional)
  dragStart(sx, sy) { this._dragLast = {sx, sy}; }
  dragMove(sx, sy) {
    if (!this._dragLast) return;
    this.panBy(sx - this._dragLast.sx, sy - this._dragLast.sy);
    this._dragLast = {sx, sy};
  }
  dragEnd() { this._dragLast = null; }
}
