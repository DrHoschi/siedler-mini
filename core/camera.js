// core/camera.js
// V14.2 – sanfter Zoom, keine "Eckenfalle", sinnvolle Begrenzung mit Puffer

export class Camera {
  constructor(viewW, viewH, worldPxW, worldPxH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.worldW = worldPxW;
    this.worldH = worldPxH;

    this.x = 0;
    this.y = 0;
    this.zoom = 1;

    // etwas Rand erlauben (damit man nie "festklebt")
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

  setWorldSize(w, h) {
    this.worldW = w;
    this.worldH = h;
    this.clamp();
  }

  centerOn(cx, cy) {
    this.x = cx - (this.viewW / 2) / this.zoom;
    this.y = cy - (this.viewH / 2) / this.zoom;
    this.clamp();
  }

  pan(dx, dy) {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
    this.clamp();
  }

  zoomTo(factor, aroundScreenX, aroundScreenY) {
    const oldZoom = this.zoom;
    const nz = Math.min(this.maxZoom, Math.max(this.minZoom, factor));
    if (nz === oldZoom) return;

    // zoome um den Finger/Mittelpunkt
    const wx = this.x + aroundScreenX / oldZoom;
    const wy = this.y + aroundScreenY / oldZoom;
    this.zoom = nz;
    this.x = wx - aroundScreenX / nz;
    this.y = wy - aroundScreenY / nz;
    this.clamp();
  }

  clamp() {
    // erlaubter Bereich in Weltkoordinaten
    const ow = this.overscroll / this.zoom;
    const oh = this.overscroll / this.zoom;

    const minX = -ow;
    const minY = -oh;
    const maxX = Math.max(0, this.worldW - this.viewW / this.zoom) + ow;
    const maxY = Math.max(0, this.worldH - this.viewH / this.zoom) + oh;

    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
  }

  // Welt->Screen
  toScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom,
      y: (wy - this.y) * this.zoom
    };
  }
}
