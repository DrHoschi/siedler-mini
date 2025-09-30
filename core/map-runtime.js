// ============================================================================
// Datei : core/map-runtime.js
// Projekt: Neue Siedler
// Version: v1.1.0
// Zweck : Karte laden, Kamera/Zoom/Drag, Grid zeichnen, Debug-Overlay
// API   : new SiedlerMap(canvas, ctx, debugElm)
// ============================================================================
(function(root, factory){
  root.SiedlerMap = factory();
})(typeof window !== 'undefined' ? window : this, function(){

  class SiedlerMap {
    constructor(canvas, ctx, debugOverlay){
      this.canvas = canvas;
      this.ctx    = ctx;
      this.debugOverlay = debugOverlay || SiedlerMap.ensureDebugOverlay();

      this.map  = null;
      this.camX = 0; this.camY = 0; this.zoom = 1.0;
      this.tileSize = 64; this.rows = 0; this.cols = 0;

      this.dragging = false; this.lastX = 0; this.lastY = 0;
      this.initEvents();
    }

    static ensureDebugOverlay(){
      let el = document.getElementById('debug-map');
      if (!el){
        el = document.createElement('pre');
        el.id = 'debug-map';
        el.style.position = 'fixed';
        el.style.bottom   = '8px';
        el.style.left     = '8px';
        el.style.padding  = '6px 8px';
        el.style.font     = '12px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        el.style.background = 'rgba(0,0,0,.35)';
        el.style.color    = '#cfe3ff';
        el.style.border   = '1px solid rgba(255,255,255,.15)';
        el.style.borderRadius = '8px';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
      }
      return el;
    }

    setSize(w,h){
      this.canvas.width  = w;
      this.canvas.height = h;
    }

    async loadMap(path){
      const res = await fetch(path, { cache:'no-cache' });
      this.map = await res.json();
      this.rows     = this.map.rows || 16;
      this.cols     = this.map.cols || 16;
      this.tileSize = this.map.tile || 64;
    }

    reload(){
      if (!this.map) return;
      this.camX = 0; this.camY = 0; this.zoom = 1.0;
    }

    initEvents(){
      const c = this.canvas;
      c.addEventListener('mousedown', e => { this.dragging = true; this.lastX = e.clientX; this.lastY = e.clientY; });
      c.addEventListener('mouseup',   () => this.dragging = false);
      c.addEventListener('mouseout',  () => this.dragging = false);
      c.addEventListener('mousemove', e => {
        if (this.dragging){
          this.camX += (this.lastX - e.clientX) / this.zoom;
          this.camY += (this.lastY - e.clientY) / this.zoom;
          this.lastX = e.clientX; this.lastY = e.clientY;
        }
      });

      // Touch
      c.addEventListener('touchstart', e => {
        if (e.touches.length === 1){
          this.dragging = true;
          this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY;
        }
      });
      c.addEventListener('touchmove', e => {
        if (this.dragging && e.touches.length === 1){
          this.camX += (this.lastX - e.touches[0].clientX) / this.zoom;
          this.camY += (this.lastY - e.touches[0].clientY) / this.zoom;
          this.lastX = e.touches[0].clientX; this.lastY = e.touches[0].clientY;
        }
      });
      c.addEventListener('touchend', () => this.dragging = false);

      // Wheel-Zoom
      c.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = 1.1;
        this.zoom = (e.deltaY < 0) ? Math.min(this.zoom * factor, 2.0)
                                   : Math.max(this.zoom / factor, 0.5);
      }, { passive:false });
    }

    draw(){
      if (!this.map) return;
      const { ctx, canvas } = this;

      ctx.save();
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-this.camX, -this.camY);

      // Hintergrund
      ctx.fillStyle = '#1a1d21';
      ctx.fillRect(this.camX, this.camY, canvas.width / this.zoom, canvas.height / this.zoom);

      // Grid
      ctx.strokeStyle = '#333';
      for (let r = 0; r <= this.rows; r++){
        ctx.beginPath();
        ctx.moveTo(0, r * this.tileSize);
        ctx.lineTo(this.cols * this.tileSize, r * this.tileSize);
        ctx.stroke();
      }
      for (let c = 0; c <= this.cols; c++){
        ctx.beginPath();
        ctx.moveTo(c * this.tileSize, 0);
        ctx.lineTo(c * this.tileSize, this.rows * this.tileSize);
        ctx.stroke();
      }

      ctx.restore();

      // Debug
      this.debugOverlay.innerText =
        `Cam: x=${this.camX.toFixed(1)} y=${this.camY.toFixed(1)} zoom=${this.zoom.toFixed(2)}\n` +
        `Map: ${this.map ? this.map.name || 'unnamed' : '-'} | rows=${this.rows} cols=${this.cols} tile=${this.tileSize}\n` +
        `Canvas=${canvas.width}x${canvas.height}`;
    }
  }

  return SiedlerMap;
});
