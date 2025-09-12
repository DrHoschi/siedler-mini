/* assets/core/camera.js
 * v17.9.2  — Pointer+Pinch Zoom & Pan, events: 'camera:change'
 * Die Kamera verwaltet Position und Zoomfaktor und fängt die Eingaben
 * direkt auf dem Canvas ab. UI-Elemente bleiben unberührt.
 */
(function () {
  const LOG = (window.CBLog?.info || console.log).bind(console, "[camera]");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  class Camera {
    constructor() {
      this.x = 0;        // Welt-Koordinate (Kartenmitte)
      this.y = 0;
      this.scale = 1;    // Zoomfaktor
      this.min = 0.5;    // min/max Zoom
      this.max = 3.0;
      this.dragging = false;
      this._pointers = new Map();   // aktive Pointer für Pinch
      this._pinchBase = null;       // {dist, scale, cx, cy}
      this.canvas = null;
    }

    bind(canvas) {
      if (this.canvas) this.unbind();
      this.canvas = canvas;

      // Wichtig für iOS: verhindert Browserverhalten
      canvas.style.touchAction = "none";

      // Pointer
      canvas.addEventListener("pointerdown", this._onPointerDown, { passive: false });
      canvas.addEventListener("pointermove", this._onPointerMove, { passive: false });
      canvas.addEventListener("pointerup",   this._onPointerUp,   { passive: false });
      canvas.addEventListener("pointercancel", this._onPointerUp, { passive: false });
      canvas.addEventListener("pointerleave",  this._onPointerUp, { passive: false });

      // Wheel (Desktop / iPad mit Trackpad)
      canvas.addEventListener("wheel", this._onWheel, { passive: false });

      LOG("bereit");
    }

    unbind() {
      if (!this.canvas) return;
      const c = this.canvas;
      c.removeEventListener("pointerdown", this._onPointerDown);
      c.removeEventListener("pointermove", this._onPointerMove);
      c.removeEventListener("pointerup",   this._onPointerUp);
      c.removeEventListener("pointercancel", this._onPointerUp);
      c.removeEventListener("pointerleave",  this._onPointerUp);
      c.removeEventListener("wheel", this._onWheel);
      this.canvas = null;
    }

    // ==== Koordinaten-Helfer =================================================
    screenToWorld(sx, sy) {
      // Canvas-Client-Offset berücksichtigen
      const rect = this.canvas.getBoundingClientRect();
      const x = (sx - rect.left) / this.scale + (this.x);
      const y = (sy - rect.top)  / this.scale + (this.y);
      return { x, y };
    }
    worldToScreen(wx, wy) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (wx - this.x) * this.scale + rect.left;
      const y = (wy - this.y) * this.scale + rect.top;
      return { x, y };
    }

    // ==== Interaktionen ======================================================
    _dispatch() {
      window.dispatchEvent(new CustomEvent("camera:change", {
        detail: { x: this.x, y: this.y, scale: this.scale }
      }));
    }

    _onWheel = (ev) => {
      ev.preventDefault();
      if (!this.canvas) return;

      // Zoom unter dem Maus-/Touchpunkt
      const rect = this.canvas.getBoundingClientRect();
      const px = (ev.clientX - rect.left) / this.scale + this.x;
      const py = (ev.clientY - rect.top)  / this.scale + this.y;

      const delta = -Math.sign(ev.deltaY) * 0.1;  // rein/raus
      const old = this.scale;
      const next = clamp(old * (1 + delta), this.min, this.max);
      const k = next / old;

      // Position so anpassen, dass der Pixelpunkt unter dem Cursor bleibt
      this.x = px - (px - this.x) * k;
      this.y = py - (py - this.y) * k;
      this.scale = next;
      this._dispatch();
    };

    _onPointerDown = (ev) => {
      ev.preventDefault();
      this.canvas.setPointerCapture?.(ev.pointerId);
      this._pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (this._pointers.size === 1) {
        this.dragging = true;
        this._last = { x: ev.clientX, y: ev.clientY };
      } else if (this._pointers.size === 2) {
        // Pinch-Start
        const [a, b] = [...this._pointers.values()];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        this._pinchBase = { dist, scale: this.scale, cx, cy };
      }
    };

    _onPointerMove = (ev) => {
      if (!this._pointers.has(ev.pointerId)) return;
      ev.preventDefault();
      this._pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      if (this._pointers.size === 1 && this.dragging) {
        // Pan
        const dx = ev.clientX - this._last.x;
        const dy = ev.clientY - this._last.y;
        this._last = { x: ev.clientX, y: ev.clientY };
        this.x -= dx / this.scale;
        this.y -= dy / this.scale;
        this._dispatch();
      } else if (this._pointers.size === 2 && this._pinchBase) {
        // Pinch
        const [a, b] = [...this._pointers.values()];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const rect = this.canvas.getBoundingClientRect();
        const px = (this._pinchBase.cx - rect.left) / this.scale + this.x;
        const py = (this._pinchBase.cy - rect.top)  / this.scale + this.y;

        const factor = clamp(dist / this._pinchBase.dist, this.min / this._pinchBase.scale, this.max / this._pinchBase.scale);
        const next = clamp(this._pinchBase.scale * factor, this.min, this.max);
        const old = this.scale;
        if (Math.abs(next - old) > 1e-4) {
          const k = next / old;
          this.x = px - (px - this.x) * k;
          this.y = py - (py - this.y) * k;
          this.scale = next;
          this._dispatch();
        }
      }
    };

    _onPointerUp = (ev) => {
      this._pointers.delete(ev.pointerId);
      this.canvas.releasePointerCapture?.(ev.pointerId);
      if (this._pointers.size <= 0) {
        this.dragging = false;
        this._pinchBase = null;
      } else if (this._pointers.size === 1) {
        // zurück zum Drag
        const [only] = [...this._pointers.values()];
        this._last = { x: only.x, y: only.y };
        this._pinchBase = null;
      }
    };
  }

  // Singleton bereitstellen
  const cam = new Camera();
  window.GameCamera = cam;
})();
