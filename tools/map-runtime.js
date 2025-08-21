// map-runtime.js

export class SiedlerMap {
  constructor(canvas, ctx, debugOverlay) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.debugOverlay = debugOverlay;

    this.map = null;
    this.camX = 0;
    this.camY = 0;
    this.zoom = 1.0;
    this.tileSize = 64;
    this.rows = 0;
    this.cols = 0;

    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;

    this.initEvents();
  }

  setSize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  async loadMap(path) {
    const res = await fetch(path);
    this.map = await res.json();
    this.rows = this.map.rows || 16;
    this.cols = this.map.cols || 16;
    this.tileSize = this.map.tile || 64;
  }

  reload() {
    if (!this.map) return;
    this.camX = 0;
    this.camY = 0;
    this.zoom = 1.0;
  }

  initEvents() {
    this.canvas.addEventListener("mousedown", e => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    this.canvas.addEventListener("mouseup", () => this.dragging = false);
    this.canvas.addEventListener("mouseout", () => this.dragging = false);
    this.canvas.addEventListener("mousemove", e => {
      if (this.dragging) {
        this.camX += (this.lastX - e.clientX) / this.zoom;
        this.camY += (this.lastY - e.clientY) / this.zoom;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });

    // Touch
    this.canvas.addEventListener("touchstart", e => {
      if (e.touches.length === 1) {
        this.dragging = true;
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
      }
    });
    this.canvas.addEventListener("touchmove", e => {
      if (this.dragging && e.touches.length === 1) {
        this.camX += (this.lastX - e.touches[0].clientX) / this.zoom;
        this.camY += (this.lastY - e.touches[0].clientY) / this.zoom;
        this.lastX = e.touches[0].clientX;
        this.lastY = e.touches[0].clientY;
      }
    });
    this.canvas.addEventListener("touchend", () => this.dragging = false);

    // Zoom
    this.canvas.addEventListener("wheel", e => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY < 0) {
        this.zoom = Math.min(this.zoom * zoomFactor, 2.0);
      } else {
        this.zoom = Math.max(this.zoom / zoomFactor, 0.5);
      }
    }, { passive: false });
  }

  draw() {
    if (!this.map) return;

    const { ctx, canvas } = this;

    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // Grid zeichnen
    ctx.strokeStyle = "#333";
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * this.tileSize);
      ctx.lineTo(this.cols * this.tileSize, r * this.tileSize);
      ctx.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * this.tileSize, 0);
      ctx.lineTo(c * this.tileSize, this.rows * this.tileSize);
      ctx.stroke();
    }

    ctx.restore();

    // Debug Overlay aktualisieren
    this.debugOverlay.innerText =
      `Cam: x=${this.camX.toFixed(1)} y=${this.camY.toFixed(1)} zoom=${this.zoom.toFixed(2)}\n` +
      `Map: ${this.map ? this.map.name || 'unnamed' : '-'}\n` +
      `rows=${this.rows} cols=${this.cols} tile=${this.tileSize}\n` +
      `Size=${canvas.width}x${canvas.height}`;
  }
}
